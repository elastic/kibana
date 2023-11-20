/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { RetrievalQAChain } from 'langchain/chains';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { ChainTool, Tool } from 'langchain/tools';
import { HttpResponseOutputParser } from 'langchain/output_parsers';

import { PassThrough, Transform, Readable } from 'stream';
import { Callbacks } from 'langchain/dist/callbacks/manager';
import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';
import { ActionsClientLlm } from '../llm/actions_client_llm';
import { KNOWLEDGE_BASE_INDEX_PATTERN } from '../../../routes/knowledge_base/constants';
import type { AgentExecutorParams, AgentExecutorResponse } from '../executors/types';

export interface AIStreamCallbacksAndOptions {
  /** `onStart`: Called once when the stream is initialized. */
  onStart?: () => Promise<void> | void;
  /** `onCompletion`: Called for each tokenized message. */
  onCompletion?: (completion: string) => Promise<void> | void;
  /** `onFinal`: Called once when the stream is closed with the final completion message. */
  onFinal?: (completion: string) => Promise<void> | void;
  /** `onToken`: Called for each tokenized message. */
  onToken?: (token: string) => Promise<void> | void;
  /**
   * A flag for enabling the experimental_StreamData class and the new protocol.
   * @see https://github.com/vercel-labs/ai/pull/425
   *
   * When StreamData is rolled out, this will be removed and the new protocol will be used by default.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  experimental_streamData?: boolean;
}

export function createCallbacksTransformer(
  cb: AIStreamCallbacksAndOptions | undefined
): TransformStream<string, Uint8Array> {
  const textEncoder = new TextEncoder();
  let aggregatedResponse = '';
  const callbacks = cb || {};

  return new TransformStream({
    async start(): Promise<void> {
      if (callbacks.onStart) await callbacks.onStart();
    },

    async transform(message, controller): Promise<void> {
      controller.enqueue(textEncoder.encode(message));
      console.log('createCallbacksTransformer, transform');
      aggregatedResponse += message;
      if (callbacks.onToken) await callbacks.onToken(message);
    },

    async flush(): Promise<void> {
      // If it's OpenAICallbacks, it has an experimental_onFunctionCall which means that the createFunctionCallTransformer
      // will handle calling onComplete.
      if (callbacks.onCompletion) {
        await callbacks.onCompletion(aggregatedResponse);
      }

      if (callbacks.onFinal) {
        await callbacks.onFinal(aggregatedResponse);
      }
    },
  });
}

/**
 * A TransformStream for LLMs that do not have their own transform stream handlers managing encoding (e.g. OpenAIStream has one for function call handling).
 * This assumes every chunk is a 'text' chunk.
 */
export function createStreamDataTransformer(experimental_streamData: boolean | undefined) {
  if (!experimental_streamData) {
    return new TransformStream({
      transform: async (chunk, controller) => {
        controller.enqueue(chunk);
      },
    });
  }
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return new TransformStream({
    transform: async (chunk, controller) => {
      const message = decoder.decode(chunk);
      console.log('createStreamDataTransformer, transform');
      controller.enqueue(encoder.encode(message));
    },
  });
}
export function LangChainStream(callbacks?: AIStreamCallbacksAndOptions): {
  stream: Readable;
  handlers: Callbacks;
} {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const runs = new Set();

  const handleError = async (e: Error, runId: string) => {
    runs.delete(runId);
    await writer.ready;
    await writer.abort(e);
  };

  const handleStart = async (runId: string) => {
    runs.add(runId);
  };

  const handleEnd = async (runId: string) => {
    runs.delete(runId);

    if (runs.size === 0) {
      await writer.ready;
      await writer.close();
    }
  };

  const streamer = undefined;

  return {
    stream,
    // .pipeThrough(createCallbacksTransformer(callbacks))
    // .pipeThrough(createStreamDataTransformer(callbacks?.experimental_streamData)),
    handlers: [
      {
        handleLLMNewToken: async (token: string) => {
          console.log('handleLLMNewToken in stream', token);
          await writer.ready;
          await writer.write(token);
        },
        handleLLMStart: async (_llm: any, _prompts: string[], runId: string) => {
          console.log('YOOOOOOOOhandleLLMStart', { _llm, _prompts, runId });
          handleStart(runId);
        },
        handleLLMEnd: async (_output: any, runId: string) => {
          console.log('YOOOOOOOOhandleLLMEnd');
          await handleEnd(runId);
        },
        handleLLMError: async (e: Error, runId: string) => {
          console.log('YOOOOOOOOhandleLLMError');
          await handleError(e, runId);
        },
        handleChainStart: async (_chain: any, _inputs: any, runId: string) => {
          console.log('YOOOOOOOOhandleChainStart', { _chain, _inputs, runId });

          const storedStream = _chain.kwargs?.llm?.getActionResultStream();
          if (storedStream instanceof Transform) {
            console.log('The variable is a Transform stream.');
          } else if (storedStream instanceof Transform && !(storedStream instanceof PassThrough)) {
            console.log(
              `The variable is a Transform stream, not a PassThrough stream.`,
              storedStream
            );
          } else {
            console.log('The variable is not a Transform stream or is a PassThrough stream.');
          }
          handleStart(runId);
        },
        handleChainEnd: async (_outputs: any, runId: string) => {
          console.log('YOOOOOOOOhandleChainEnd');
          await handleEnd(runId);
        },
        handleChainError: async (e: Error, runId: string) => {
          console.log('YOOOOOOOOhandleChainError');
          await handleError(e, runId);
        },
        handleToolStart: async (_tool: any, _input: string, runId: string) => {
          console.log('YOOOOOOOOhandleToolStart');
          streamer;
          handleStart(runId);
        },
        handleToolEnd: async (_output: string, runId: string) => {
          console.log('YOOOOOOOOhandleToolEnd');
          await handleEnd(runId);
        },
        handleToolError: async (e: Error, runId: string) => {
          console.log('YOOOOOOOOhandleToolError');
          await handleError(e, runId);
        },
      },
    ],
  };
}

export const callAgentExecutor = async ({
  actions,
  connectorId,
  esClient,
  langChainMessages,
  llmType,
  logger,
  request,
  elserId,
  kbResource,
}: AgentExecutorParams): AgentExecutorResponse => {
  const llm = new ActionsClientLlm({
    actions,
    connectorId,
    request,
    llmType,
    logger,
    streaming: true,
  });

  const pastMessages = langChainMessages.slice(0, -1); // all but the last message
  const latestMessage = langChainMessages.slice(-1); // the last message

  const memory = new BufferMemory({
    chatHistory: new ChatMessageHistory(pastMessages),
    memoryKey: 'chat_history', // this is the key expected by https://github.com/langchain-ai/langchainjs/blob/a13a8969345b0f149c1ca4a120d63508b06c52a5/langchain/src/agents/initialize.ts#L166
    inputKey: 'input',
    outputKey: 'output',
    returnMessages: true,
  });

  // ELSER backed ElasticsearchStore for Knowledge Base
  const esStore = new ElasticsearchStore(
    esClient,
    KNOWLEDGE_BASE_INDEX_PATTERN,
    logger,
    elserId,
    kbResource
  );

  const modelExists = await esStore.isModelInstalled();
  if (!modelExists) {
    throw new Error(
      'Please ensure ELSER is configured to use the Knowledge Base, otherwise disable the Knowledge Base in Advanced Settings to continue.'
    );
  }

  // Create a chain that uses the ELSER backed ElasticsearchStore, override k=10 for esql query generation for now
  const chain = RetrievalQAChain.fromLLM(llm, esStore.asRetriever(10));

  const tools: Tool[] = [
    new ChainTool({
      name: 'esql-language-knowledge-base',
      description:
        'Call this for knowledge on how to build an ESQL query, or answer questions about the ES|QL query language.',
      chain,
    }),
  ];
  const { stream, handlers } = LangChainStream();

  const executor = await initializeAgentExecutorWithOptions(tools, llm, {
    agentType: 'chat-conversational-react-description',
    memory,
    verbose: false,
  });
  const parser = new HttpResponseOutputParser();
  //
  // const stream = await llm.pipe(parser).stream({ text: latestMessage[0].content });
  //
  // const httpResponse = new Response(stream, {
  //   headers: {
  //     'Content-Type': 'text/plain; charset=utf-8',
  //   },
  // });
  // console.log('THIS SHOULD BE SECOND', httpResponse);
  //
  // return httpResponse;

  const resp = await executor.stream(
    { input: latestMessage[0].content },
    {
      callbacks: handlers,
    }
  );
  return new Promise((resolve) => {
    const storedStream = llm.getActionResultStream();
    console.log('THIS SHOULD BE Promise', { stream, resp, storedStream });
    storedStream.on('data', (response) => {
      console.log('THIS SHOULD BE storedStream data', response);
    });
    storedStream.on('end', () => {
      console.log('THIS SHOULD BE storedStream end');
    });
    // stream.pipe(new PassThrough());

    // stream.on('data', (response) => {
    //   console.log('THIS SHOULD BE stream data', response);
    // });
    // stream.on('end', () => {
    //   console.log('THIS SHOULD BE stream end');
    // });
    resolve(stream);
  });
  // await executor.call(
  //   { input: latestMessage[0].content }
  // {
  //   callbacks: [
  //     {
  //       handleLLMNewToken(token: string) {
  //         console.log('handleLLMNewToken in call', token);
  //       },
  //     },
  //   ],
  // }
  // );
  console.log('THIS SHOULD BE SECOND', stream);
  console.log('THIS SHOULD BE SECOND ALSO', llm.getActionResultStream());
  // return stream; // llm.getActionResultStream().pipe(new PassThrough());
  // return (resp as unknown as Readable).pipe(new PassThrough()); // llm.getActionResultStream();
  // {
  //   connector_id: connectorId,
  //   data: llm.getActionResultStream(), // the response from the actions framework
  //   status: 'ok',
  // };
  return new StreamingTextResponse(stream);
};
export class StreamingTextResponse extends Response {
  constructor(res: ReadableStream, init?: ResponseInit, data?) {
    let processedStream = res;

    if (data) {
      processedStream = res.pipeThrough(data.stream);
    }

    super(processedStream as any, {
      ...init,
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...init?.headers,
      },
    });
  }
}
