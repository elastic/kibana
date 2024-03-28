/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { castArray } from 'lodash';
import { filter, tap } from 'rxjs';
import { Builder } from 'xml2js';
import { createInternalServerError } from '../../../../../common/conversation_complete';
import {
  BedrockChunkMember,
  eventstreamSerdeIntoObservable,
} from '../../../util/eventstream_serde_into_observable';
import { jsonSchemaToFlatParameters } from '../../../util/json_schema_to_flat_parameters';
import { processBedrockStream } from './process_bedrock_stream';
import type { LlmApiAdapterFactory } from '../types';

function replaceFunctionsWithTools(content: string) {
  return content.replaceAll(/(function)(s|[\s*\.])?(?!\scall)/g, (match, p1, p2) => {
    return `tool${p2 || ''}`;
  });
}

// Most of the work here is to re-format OpenAI-compatible functions for Claude.
// See https://github.com/anthropics/anthropic-tools/blob/main/tool_use_package/prompt_constructors.py

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

      ${
        functions?.find((fn) => fn.name === 'context')
          ? `The "context" function is ALWAYS used after a user question. Even if it was used before, your job is to answer the last user question,
      even if the "context" function was executed after that. Consider the tools you need to answer the user's question.`
          : ''
      }
      
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
          ${
            fn.parameters
              ? `<parameters>
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
          </parameters>`
              : ''
          }
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
    } else {
      functionsPrompt = `No tools are available anymore. DO NOT UNDER ANY CIRCUMSTANCES call any tool, regardless of whether it was previously called.`;
    }

    const formattedMessages = [
      {
        role: 'system',
        content: `${replaceFunctionsWithTools(systemMessage.message.content!)}
          
          ${functionsPrompt}
          `,
      },
      ...otherMessages.map((message, index) => {
        const builder = new Builder({ headless: true });
        if (message.message.name) {
          const deserialized = JSON.parse(message.message.content || '{}');

          if ('error' in deserialized) {
            return {
              role: message.message.role,
              content: dedent(`<function_results>
                  <system>
                    ${builder.buildObject(deserialized)}
                  </system>
                </function_results>
              `),
            };
          }

          return {
            role: message.message.role,
            content: dedent(`
              <function_results>
                <result>
                  <tool_name>${message.message.name}</tool_name>
                  <stdout>
                    ${builder.buildObject(deserialized)}
                  </stdout>
                </result>
              </function_results>`),
          };
        }

        let content = replaceFunctionsWithTools(message.message.content || '');

        if (message.message.function_call?.name) {
          content += builder.buildObject({
            function_calls: {
              invoke: {
                tool_name: message.message.function_call.name,
                parameters: JSON.parse(message.message.function_call.arguments || '{}'),
              },
            },
          });
        }

        if (index === otherMessages.length - 1 && functionCall) {
          content += `
          
          Remember, use the ${functionCall} tool to answer this question.`;
        }

        return {
          role: message.message.role,
          content,
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
    eventstreamSerdeIntoObservable(readable, logger).pipe(
      tap((value) => {
        if ('modelStreamErrorException' in value) {
          throw createInternalServerError(value.modelStreamErrorException.originalMessage);
        }
      }),
      filter((value): value is BedrockChunkMember => {
        return 'chunk' in value && value.chunk?.headers?.[':event-type']?.value === 'chunk';
      }),
      processBedrockStream({ logger, functions })
    ),
});
