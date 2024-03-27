/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subscriber } from 'rxjs';
import { v4 } from 'uuid';
import { Parser } from 'xml2js';
import type { Logger } from '@kbn/logging';
import type { JSONSchema } from 'json-schema-to-ts';
import {
  ChatCompletionChunkEvent,
  createInternalServerError,
  StreamingChatResponseEventType,
  TokenCountEvent,
} from '../../../../../common/conversation_complete';
import type { BedrockChunkMember } from '../../../util/eventstream_serde_into_observable';
import { convertDeserializedXmlWithJsonSchema } from '../../../util/convert_deserialized_xml_with_json_schema';
import { parseSerdeChunkBody } from './parse_serde_chunk_body';
import type {
  CompletionChunk,
  ContentBlockDeltaChunk,
  ContentBlockStartChunk,
  MessageStopChunk,
} from './types';

async function parseFunctionCallXml({
  xml,
  functions,
}: {
  xml: string;
  functions?: Array<{ name: string; description: string; parameters?: JSONSchema }>;
}) {
  const parser = new Parser();

  const parsedValue = await parser.parseStringPromise(xml);
  const fnName = parsedValue.function_calls.invoke[0].tool_name[0];
  const parameters = (
    parsedValue.function_calls.invoke as Array<{ parameters: Array<Record<string, string[]>> }>
  ).flatMap((invoke) => invoke.parameters ?? []);
  const functionDef = functions?.find((fn) => fn.name === fnName);

  if (!functionDef) {
    throw createInternalServerError(
      `Function definition for ${fnName} not found. ${
        functions?.length
          ? 'Available are: ' + functions.map((fn) => fn.name).join(', ') + '.'
          : 'No functions are available.'
      }`
    );
  }

  const args = functionDef.parameters
    ? convertDeserializedXmlWithJsonSchema(parameters, functionDef.parameters)
    : {};

  return {
    name: fnName,
    arguments: JSON.stringify(args),
  };
}

export function processBedrockStream({
  logger,
  functions,
}: {
  logger: Logger;
  functions?: Array<{ name: string; description: string; parameters?: JSONSchema }>;
}) {
  return (source: Observable<BedrockChunkMember>) =>
    new Observable<ChatCompletionChunkEvent | TokenCountEvent>((subscriber) => {
      let functionCallsBuffer: string = '';
      const id = v4();

      // We use this to make sure we don't complete the Observable
      // before all operations have completed.
      let nextPromise = Promise.resolve();

      // As soon as we see a `<function` token, we write all chunks
      // to a buffer, that we flush as a function request if we
      // spot the stop sequence.

      async function handleNext(value: BedrockChunkMember) {
        const chunkBody: CompletionChunk = parseSerdeChunkBody(value.chunk);

        if (isTokenCountCompletionChunk(chunkBody)) {
          return emitTokenCountEvent(subscriber, chunkBody);
        }

        if (
          chunkBody.type !== 'content_block_start' &&
          chunkBody.type !== 'content_block_delta' &&
          chunkBody.type !== 'message_delta'
        ) {
          return;
        }

        // completion: what we eventually want to emit
        let completion = chunkBody.type !== 'message_delta' ? getCompletion(chunkBody) : '';

        const isStartOfFunctionCall = !functionCallsBuffer && completion.includes('<function');

        const isEndOfFunctionCall =
          functionCallsBuffer &&
          chunkBody.type === 'message_delta' &&
          chunkBody.delta.stop_sequence === '</function_calls>';

        const isInFunctionCall = !!functionCallsBuffer;

        if (isStartOfFunctionCall) {
          // when we see the start of the function call, split on <function,
          // set completion to the part before, and buffer the part after
          const [before, after] = completion.split('<function');
          functionCallsBuffer += `<function${after}`;
          completion = before.trimEnd();
        } else if (isEndOfFunctionCall) {
          // parse the buffer as a function call
          functionCallsBuffer += chunkBody.delta.stop_sequence ?? '';

          logger.debug(`Parsing xml:\n${functionCallsBuffer}`);

          subscriber.next({
            id,
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            message: {
              content: '',
              function_call: await parseFunctionCallXml({
                xml: functionCallsBuffer,
                functions,
              }),
            },
          });
          // reset the buffer
          functionCallsBuffer = '';
        } else if (isInFunctionCall) {
          // write everything to the buffer
          functionCallsBuffer += completion;
          completion = '';
        }

        if (completion.trim()) {
          // OpenAI tokens come roughly separately, Bedrock/Claude
          // chunks are bigger, so we split them up to give a more
          // responsive feel in the UI
          const parts = completion.split(' ');
          parts.forEach((part, index) => {
            subscriber.next({
              id,
              type: StreamingChatResponseEventType.ChatCompletionChunk,
              message: {
                content: index === parts.length - 1 ? part : part + ' ',
              },
            });
          });
        }
      }

      source.subscribe({
        next: (value) => {
          nextPromise = nextPromise.then(() =>
            handleNext(value).catch((error) => subscriber.error(error))
          );
        },
        error: (err) => {
          subscriber.error(err);
        },
        complete: () => {
          nextPromise.then(() => subscriber.complete());
        },
      });
    });
}

function isTokenCountCompletionChunk(value: any): value is MessageStopChunk {
  return value.type === 'message_stop' && 'amazon-bedrock-invocationMetrics' in value;
}

function emitTokenCountEvent(
  subscriber: Subscriber<ChatCompletionChunkEvent | TokenCountEvent>,
  chunk: MessageStopChunk
) {
  const { inputTokenCount, outputTokenCount } = chunk['amazon-bedrock-invocationMetrics'];

  subscriber.next({
    type: StreamingChatResponseEventType.TokenCount,
    tokens: {
      completion: outputTokenCount,
      prompt: inputTokenCount,
      total: inputTokenCount + outputTokenCount,
    },
  });
}

function getCompletion(chunk: ContentBlockStartChunk | ContentBlockDeltaChunk) {
  return chunk.type === 'content_block_start' ? chunk.content_block.text : chunk.delta.text;
}
