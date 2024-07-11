/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import agent, { Span } from 'elastic-apm-node';
import type { Logger } from '@kbn/logging';
import { streamFactory, StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExecuteConnectorRequestBody, TraceData } from '@kbn/elastic-assistant-common';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { BaseCallbackHandler } from '@langchain/core/dist/callbacks/base';
import { withAssistantSpan } from '../../tracers/apm/with_assistant_span';
import { AGENT_NODE_TAG } from './nodes/run_agent';
import { DEFAULT_ASSISTANT_GRAPH_ID, DefaultAssistantGraph } from './graph';
import type { OnLlmResponse, TraceOptions } from '../../executors/types';

interface StreamGraphParams {
  apmTracer: APMTracer;
  assistantGraph: DefaultAssistantGraph;
  inputs: { input: string };
  isOpenAI: boolean;
  logger: Logger;
  onLlmResponse?: OnLlmResponse;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  traceOptions?: TraceOptions;
}

/**
 * Execute the graph in streaming mode
 *
 * @param apmTracer
 * @param assistantGraph
 * @param inputs
 * @param logger
 * @param onLlmResponse
 * @param request
 * @param traceOptions
 */
export const streamGraph = async ({
  apmTracer,
  assistantGraph,
  inputs,
  logger,
  onLlmResponse,
  request,
  traceOptions,
}: StreamGraphParams): Promise<StreamResponseWithHeaders> => {
  const isOpenAI = true;
  let streamingSpan: Span | undefined;
  if (agent.isStarted()) {
    streamingSpan = agent.startSpan(`${DEFAULT_ASSISTANT_GRAPH_ID} (Streaming)`) ?? undefined;
  }
  const {
    end: streamEnd,
    push,
    responseWithHeaders,
  } = streamFactory<{ type: string; payload: string }>(request.headers, logger, false, false);

  let didEnd = false;
  const handleStreamEnd = (finalResponse: string, isError = false) => {
    if (onLlmResponse) {
      onLlmResponse(
        finalResponse,
        {
          transactionId: streamingSpan?.transaction?.ids?.['transaction.id'],
          traceId: streamingSpan?.ids?.['trace.id'],
        },
        isError
      ).catch(() => {});
    }
    streamEnd();
    didEnd = true;
    if ((streamingSpan && !streamingSpan?.outcome) || streamingSpan?.outcome === 'unknown') {
      streamingSpan.outcome = 'success';
    }
    streamingSpan?.end();
  };

  let message = '';
  let tokenParentRunId = '';
  const callbacks: Array<Partial<BaseCallbackHandler>> = isOpenAI
    ? []
    : [
        {
          handleLLMNewToken(payload, _idx, _runId, parentRunId) {
            if (tokenParentRunId.length === 0 && !!parentRunId) {
              // set the parent run id as the parentRunId of the first token
              // this is used to ensure that all tokens in the stream are from the same run
              // filtering out runs that are inside e.g. tool calls
              tokenParentRunId = parentRunId;
            }
            if (payload.length && !didEnd && tokenParentRunId === parentRunId) {
              push({ payload, type: 'content' });
              // store message in case of error
              message += payload;
            }
          },
          handleChainEnd(_outputs, _runId, parentRunId) {
            // if parentRunId is undefined, this is the end of the stream
            if (!parentRunId) {
              handleStreamEnd(message);
            }
          },
        },
      ];

  const stream = assistantGraph.streamEvents(inputs, {
    callbacks: [...callbacks, apmTracer, ...(traceOptions?.tracers ?? [])],
    runName: DEFAULT_ASSISTANT_GRAPH_ID,
    streamMode: 'values',
    tags: traceOptions?.tags ?? [],
    version: 'v1',
  });
  let finalMessage = '';

  let currentOutput = '';
  let finalOutputIndex = -1;
  const finalOutputStartToken = '"action":"FinalAnswer","action_input":"';
  let streamingFinished = false;
  const finalOutputStopRegex = /(?<!\\)"/; // /(?<!\\)\"/;
  let extraOutput = '';
  const processEvent = async () => {
    try {
      const { value, done } = await stream.next();
      if (done) return;

      const event = value;
      // only process events that are part of the agent run
      if ((event.tags || []).includes(AGENT_NODE_TAG)) {
        if (event.name === 'ActionsClientChatOpenAI') {
          if (event.event === 'on_llm_stream') {
            const chunk = event.data?.chunk;
            const msg = chunk.message;
            if (msg?.tool_call_chunks && msg?.tool_call_chunks.length > 0) {
              // I don't think we hit this anymore because of our check for AGENT_NODE_TAG
              // however, no harm to keep it in
              /* empty */
            } else if (!didEnd) {
              if (msg.response_metadata?.finish_reason === 'stop') {
                handleStreamEnd(finalMessage);
              } else {
                push({ payload: msg.content, type: 'content' });
                finalMessage += msg.content;
              }
            }
          } else if (event.event === 'on_llm_end') {
            const generations = event.data.output?.generations[0];

            if (generations && generations[0]?.generationInfo.finish_reason === 'stop') {
              handleStreamEnd(finalMessage);
            }
          }
        }
        if (event.name === 'ActionsClientSimpleChatModel') {
          if (event.event === 'on_llm_stream') {
            const chunk = event.data?.chunk;

            const msg = chunk.content;
            if (finalOutputIndex === -1) {
              // Remove whitespace to simplify parsing
              currentOutput += msg; // .replace(/\s/g, '');
              const currentFormattedOutput = currentOutput.replace(/\s/g, '');
              if (currentFormattedOutput.includes(finalOutputStartToken)) {
                const nonStrippedToken = '"action_input": "';
                finalOutputIndex = currentOutput.indexOf(nonStrippedToken);
                const contentStartIndex = finalOutputIndex + nonStrippedToken.length;
                extraOutput = currentOutput.substring(contentStartIndex);
                push({ payload: extraOutput, type: 'content' });
                finalMessage += extraOutput;
              }
            } else if (!streamingFinished && !didEnd) {
              const finalOutputEndIndex = msg.search(finalOutputStopRegex);
              if (finalOutputEndIndex !== -1) {
                extraOutput = msg.substring(0, finalOutputEndIndex);
                streamingFinished = true;
                if (extraOutput.length > 0) {
                  push({ payload: extraOutput, type: 'content' });
                  finalMessage += extraOutput;
                }
              } else {
                push({ payload: chunk.content, type: 'content' });
                finalMessage += chunk.content;
              }
            }
          } else if (event.event === 'on_llm_end') {
            if (streamingFinished) {
              handleStreamEnd(finalMessage);
            }
          }
        }
      }

      void processEvent();
    } catch (err) {
      // if I throw an error here, it crashes the server. Not sure how to get around that.
      // If I put await on this function the error works properly, but when there is not an error
      // it waits for the entire stream to complete before resolving
      const error = transformError(err);

      if (error.message === 'AbortError') {
        // user aborted the stream, we must end it manually here
        return handleStreamEnd(finalMessage);
      }
      logger.error(`Error streaming from LangChain: ${error.message}`);
      push({ payload: error.message, type: 'content' });
      handleStreamEnd(error.message, true);
    }
  };

  // Start processing events, do not await! Return `responseWithHeaders` immediately
  if (isOpenAI) void processEvent();

  return responseWithHeaders;
};

interface InvokeGraphParams {
  apmTracer: APMTracer;
  assistantGraph: DefaultAssistantGraph;
  inputs: { input: string };
  onLlmResponse?: OnLlmResponse;
  traceOptions?: TraceOptions;
}
interface InvokeGraphResponse {
  output: string;
  traceData: TraceData;
}

/**
 * Execute the graph in non-streaming mode
 *
 * @param apmTracer
 * @param assistantGraph
 * @param inputs
 * @param onLlmResponse
 * @param traceOptions
 */
export const invokeGraph = async ({
  apmTracer,
  assistantGraph,
  inputs,
  onLlmResponse,
  traceOptions,
}: InvokeGraphParams): Promise<InvokeGraphResponse> => {
  return withAssistantSpan(DEFAULT_ASSISTANT_GRAPH_ID, async (span) => {
    let traceData: TraceData = {};
    if (span?.transaction?.ids['transaction.id'] != null && span?.ids['trace.id'] != null) {
      traceData = {
        // Transactions ID since this span is the parent
        transactionId: span.transaction.ids['transaction.id'],
        traceId: span.ids['trace.id'],
      };
      span.addLabels({ evaluationId: traceOptions?.evaluationId });
    }

    const r = await assistantGraph.invoke(inputs, {
      callbacks: [apmTracer, ...(traceOptions?.tracers ?? [])],
      runName: DEFAULT_ASSISTANT_GRAPH_ID,
      tags: traceOptions?.tags ?? [],
    });
    const output = r.agentOutcome.returnValues.output;

    if (onLlmResponse) {
      await onLlmResponse(output, traceData);
    }

    return { output, traceData };
  });
};
