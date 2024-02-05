/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toUtf8 } from '@smithy/util-utf8';
import { Observable } from 'rxjs';
import { v4 } from 'uuid';
import { Parser } from 'xml2js';
import type { Logger } from '@kbn/logging';
import { JSONSchema } from 'json-schema-to-ts';
import {
  ChatCompletionChunkEvent,
  createInternalServerError,
  StreamingChatResponseEventType,
} from '../../../../common/conversation_complete';
import type { BedrockChunkMember } from '../../util/eventstream_serde_into_observable';
import { convertDeserializedXmlWithJsonSchema } from '../../util/convert_deserialized_xml_with_json_schema';

async function parseFunctionCallXml({
  xml,
  functions,
}: {
  xml: string;
  functions?: Array<{ name: string; description: string; parameters: JSONSchema }>;
}) {
  const parser = new Parser();

  const parsedValue = await parser.parseStringPromise(xml);
  const invoke = parsedValue.function_calls.invoke[0];
  const fnName = invoke.tool_name[0];
  const parameters: Array<Record<string, string[]>> = invoke.parameters ?? [];
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

  const args = convertDeserializedXmlWithJsonSchema(parameters, functionDef.parameters);

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
  functions?: Array<{ name: string; description: string; parameters: JSONSchema }>;
}) {
  return (source: Observable<BedrockChunkMember>) =>
    new Observable<ChatCompletionChunkEvent>((subscriber) => {
      let functionCallsBuffer: string = '';
      const id = v4();

      // We use this to make sure we don't complete the Observable
      // before all operations have completed.
      let nextPromise = Promise.resolve();

      // As soon as we see a `<function` token, we write all chunks
      // to a buffer, that we flush as a function request if we
      // spot the stop sequence.

      async function handleNext(value: BedrockChunkMember) {
        const response: {
          completion: string;
          stop_reason: string | null;
          stop: null | string;
        } = JSON.parse(
          Buffer.from(JSON.parse(toUtf8(value.chunk.body)).bytes, 'base64').toString('utf-8')
        );

        let completion = response.completion;

        const isStartOfFunctionCall = !functionCallsBuffer && completion.includes('<function');

        const isEndOfFunctionCall = functionCallsBuffer && response.stop === '</function_calls>';

        const isInFunctionCall = !!functionCallsBuffer;

        if (isStartOfFunctionCall) {
          const [before, after] = completion.split('<function');
          functionCallsBuffer += `<function${after}`;
          completion = before.trimEnd();
        } else if (isEndOfFunctionCall) {
          completion = '';
          functionCallsBuffer += response.completion + response.stop;

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

          functionCallsBuffer = '';
        } else if (isInFunctionCall) {
          completion = '';
          functionCallsBuffer += response.completion;
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
