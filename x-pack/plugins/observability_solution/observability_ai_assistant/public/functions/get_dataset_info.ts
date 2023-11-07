/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, groupBy, uniq } from 'lodash';
import { CreateChatCompletionResponse } from 'openai';
import { FunctionVisibility, MessageRole, RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';

export function registerGetDatasetInfoFunction({
  service,
  registerFunction,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'get_dataset_info',
      contexts: ['core'],
      visibility: FunctionVisibility.System,
      description: `Use this function to get information about indices/datasets available and the fields available on them.

      providing empty string as index name will retrieve all indices
      else list of all fields for the given index will be given. if no fields are returned this means no indices were matched by provided index pattern.
      wildcards can be part of index name.`,
      descriptionForUser:
        'This function allows the assistant to get information about available indices and their fields.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: {
            type: 'string',
            description:
              'index pattern the user is interested in or empty string to get information about all available indices',
          },
        },
        required: ['index'],
      } as const,
    },
    async ({ arguments: { index }, messages, connectorId }, signal) => {
      const response = await service.callApi(
        'POST /internal/observability_ai_assistant/functions/get_dataset_info',
        {
          params: {
            body: {
              index,
            },
          },
          signal,
        }
      );

      const allFields = response.fields;

      const fieldNames = uniq(allFields.map((field) => field.name));

      const groupedFields = groupBy(allFields, (field) => field.name);

      const relevantFields = await Promise.all(
        chunk(fieldNames, 500).map(async (fieldsInChunk) => {
          const chunkResponse = (await service.callApi(
            'POST /internal/observability_ai_assistant/chat',
            {
              signal,
              params: {
                query: {
                  stream: false,
                },
                body: {
                  connectorId,
                  messages: [
                    {
                      '@timestamp': new Date().toISOString(),
                      message: {
                        role: MessageRole.System,
                        content: `You are a helpful assistant for Elastic Observability.
                        Your task is to create a list of field names that are relevant
                        to the conversation, using ONLY the list of fields and
                        types provided in the last user message. DO NOT UNDER ANY
                        CIRCUMSTANCES include fields not mentioned in this list.`,
                      },
                    },
                    ...messages.slice(1),
                    {
                      '@timestamp': new Date().toISOString(),
                      message: {
                        role: MessageRole.User,
                        content: `This is the list:

                        ${fieldsInChunk.join('\n')}`,
                      },
                    },
                  ],
                  functions: [
                    {
                      name: 'fields',
                      description: 'The fields you consider relevant to the conversation',
                      parameters: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          fields: {
                            type: 'array',
                            additionalProperties: false,
                            addditionalItems: false,
                            items: {
                              type: 'string',
                              additionalProperties: false,
                              addditionalItems: false,
                            },
                          },
                        },
                        required: ['fields'],
                      },
                    },
                  ],
                  functionCall: 'fields',
                },
              },
            }
          )) as CreateChatCompletionResponse;

          return chunkResponse.choices[0].message?.function_call?.arguments
            ? (
                JSON.parse(chunkResponse.choices[0].message?.function_call?.arguments) as {
                  fields: string[];
                }
              ).fields
                .filter((field) => fieldNames.includes(field))
                .map((field) => {
                  const fieldDescriptors = groupedFields[field];
                  return `${field}:${fieldDescriptors
                    .map((descriptor) => descriptor.type)
                    .join(',')}`;
                })
            : [chunkResponse.choices[0].message?.content ?? ''];
        })
      );

      return {
        content: {
          indices: response.indices,
          fields: relevantFields.flat(),
        },
      };
    }
  );
}
