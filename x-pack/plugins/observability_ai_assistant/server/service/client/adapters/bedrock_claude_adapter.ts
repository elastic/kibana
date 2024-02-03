/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toUtf8 } from '@smithy/util-utf8';
import { castArray } from 'lodash';
import { filter, Observable } from 'rxjs';
import { v4 } from 'uuid';
import { Builder, Parser } from 'xml2js';
import {
  createInternalServerError,
  StreamingChatResponseEventType,
  type ChatCompletionChunkEvent,
} from '../../../../common/conversation_complete';
import { convertDeserializedXmlWithJsonSchema } from '../../util/convert_deserialized_xml_with_json_schema';
import { eventstreamSerdeIntoObservable } from '../../util/eventstream_serde_into_observable';
import { jsonSchemaToFlatParameters } from '../../util/json_schema_to_flat_parameters';
import type { LlmApiAdapterFactory } from './types';

function replaceFunctionsWithTools(content: string) {
  return content.replaceAll(/(function)(s)?(?!\scall)/g, (match, p1, p2) => {
    return `tool${p2 || ''}`;
  });
}

export const createBedrockClaudeAdapter: LlmApiAdapterFactory = ({
  messages,
  functions,
  functionCall,
  logger,
}) => ({
  getSubAction: () => {
    const [systemMessage, ...otherMessages] = messages;

    const filteredFunctions = functionCall
      ? functions?.filter((fn) => fn.name === functionCall)
      : functions;

    let functionsPrompt: string = '';

    if (filteredFunctions?.length) {
      functionsPrompt = `In this environment, you have access to a set of tools you can use to answer the user's question.

      When deciding what tool to use, keep in mind that you can call other tools in successive requests, so decide what tool
      would be a good first step.

      You MUST only invoke a single tool, and invoke it once. Other invocations will be ignored.
      You MUST wait for the results before invoking another.
      You can call multiple tools in successive messages. This means you can chain function calls. If any tool was used in a previous
      message, consider whether it still makes sense to follow it up with another function call.

      The "recall" function is ALWAYS used after a user question. Even if it was used before, your job is to answer the last user question,
      even if the "recall" function was executed after that. Consider the tools you need to answer the user's question.
      
      Rather than explaining how you would call a function, just generate the XML to call the function. It will automatically be
      executed and returned to you.

      These results are generally not visible to the user. Treat them as if they are not,
      unless specified otherwise.

      ONLY respond with XML, do not add any text.

      If a parameter allows multiple values, separate the values by ","
      
      You may call them like this.

      <function_calls>
        <invoke>
          <tool_name>$TOOL_NAME</tool_name>
          <parameters>
            <$PARAMETER_NAME>$PARAMETER_VALUE</$PARAMETER_NAME>
            ...
          </parameters>
        </invoke>
      </function_calls>

      Here are the tools available:

      <tools>
        ${filteredFunctions
          .map(
            (fn) => `<tool_description>
          <tool_name>${fn.name}</tool_name>
          <description>${fn.description}</description>
          <parameters>
            ${jsonSchemaToFlatParameters(fn.parameters).map((param) => {
              return `<parameter>
                <name>${param.name}</name>
                <type>${param.type}</type>
                <description>
                  ${param.description || ''}
                  Required: ${!!param.required}
                  Multiple: ${!!param.array}
                  ${
                    param.enum || param.constant
                      ? `Allowed values: ${castArray(param.constant || param.enum).join(', ')}`
                      : ''
                  }
                </description>
              </parameter>`;
            })}
          </parameters>
        </tool_description>`
          )
          .join('\n')}
      </tools>
      
      
      Examples:

      Assistant:
      <function_calls>
        <invoke>
          <tool_name>my_tool</tool_name>
          <parameters>
            <myParam>foo</myParam>
          </parameters>
        </invoke>
      </function_calls>

      Assistant: 
      <function_calls>
        <invoke>
          <tool_name>another_tool</tool_name>
          <parameters>
            <myParam>foo</myParam>
          </parameters>
        </invoke>
      </function_calls>

      `;
    }

    const formattedMessages = [
      {
        role: 'system',
        content: `${replaceFunctionsWithTools(systemMessage.message.content!)}
          
          ${functionsPrompt}
          `,
      },
      ...otherMessages.map((message, index) => {
        if (message.message.name) {
          const deserialized = JSON.parse(message.message.content || '{}');

          if ('error' in deserialized) {
            return {
              role: message.message.role,
              content: `<function_results>
                  <system>
                    ${JSON.stringify(deserialized)}
                  </system>
                </function_results>
              `,
            };
          }

          return {
            role: message.message.role,
            content: `
              <function_results>
                <result>
                  <tool_name>${message.message.name}</tool_name>
                  <stdout>
                    ${message.message.content}
                  </stdout>
                </result>
              </function_results>`,
          };
        }

        let content = message.message.content || '';

        if (message.message.function_call) {
          content += new Builder({ headless: true }).buildObject({
            function_calls: {
              invoke: {
                tool_name: message.message.function_call.name,
              },
            },
          });
        }

        if (index === messages.length - 1 && functionCall) {
          content += `
          
          Remember, use the ${functionCall} tool to answer this question.`;
        }

        return {
          role: message.message.role,
          content: replaceFunctionsWithTools(content),
        };
      }),
    ];

    return {
      subAction: 'invokeStream',
      subActionParams: {
        messages: formattedMessages,
        temperature: 0,
        stopSequences: ['\n\nHuman:', '</function_calls>'],
      },
    };
  },
  streamIntoObservable: (readable) =>
    eventstreamSerdeIntoObservable(readable).pipe(
      filter((value) => {
        return value.chunk.headers?.[':event-type']?.value === 'chunk';
      }),
      (source) => {
        return new Observable<ChatCompletionChunkEvent>((subscriber) => {
          let functionCallsBuffer: string = '';
          const id = v4();
          source.subscribe({
            next: (value) => {
              const response: {
                completion: string;
                stop_reason: string | null;
                stop: null | string;
              } = JSON.parse(
                Buffer.from(JSON.parse(toUtf8(value.chunk.body)).bytes, 'base64').toString('utf-8')
              );

              let completion = response.completion;

              if (!functionCallsBuffer && completion.includes('<function')) {
                const [before, after] = completion.split('<function');
                functionCallsBuffer += `<function${after}`;
                completion = before;
              } else if (functionCallsBuffer && response.stop === '</function_calls>') {
                completion = '';
                functionCallsBuffer += response.completion + response.stop;

                const parser = new Parser();

                logger.debug(`Parsing xml:
                
                ${functionCallsBuffer}`);

                parser
                  .parseStringPromise(functionCallsBuffer)
                  .then((val) => {
                    const invoke = val.function_calls.invoke[0];
                    const fnName = invoke.tool_name[0];
                    const parameters: Array<Record<string, string[]>> = invoke.parameters ?? [];
                    const functionDef = functions?.find((fn) => fn.name === fnName);

                    if (!functionDef) {
                      throw createInternalServerError(
                        `Function definition for ${fnName} not found. ${
                          functions?.length
                            ? 'Available are: ' + functions?.map((fn) => fn.name).join(', ') + '.'
                            : 'No functions are available.'
                        }`
                      );
                    }

                    const args = convertDeserializedXmlWithJsonSchema(
                      parameters,
                      functionDef.parameters
                    );

                    subscriber.next({
                      id,
                      type: StreamingChatResponseEventType.ChatCompletionChunk,
                      message: {
                        content: '',
                        function_call: {
                          name: fnName,
                          arguments: JSON.stringify(args),
                        },
                      },
                    });
                  })
                  .catch((err) => {
                    subscriber.error(err);
                  });

                functionCallsBuffer = '';
              } else if (functionCallsBuffer) {
                completion = '';
                functionCallsBuffer += response.completion;
              }

              if (completion.trim()) {
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
            },
            error: (err) => {
              subscriber.error(err);
            },
            complete: () => {
              subscriber.complete();
            },
          });
        });
      }
    ),
});
