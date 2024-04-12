/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, groupBy, uniq } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { FunctionRegistrationParameters } from '.';
import { FunctionVisibility } from '../../common/functions/types';
import { MessageRole } from '../../common/types';
import { concatenateChatCompletionChunks } from '../../common/utils/concatenate_chat_completion_chunks';

export function registerGetDatasetInfoFunction({
  resources,
  functions,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: 'get_dataset_info',
      contexts: ['core'],
      visibility: FunctionVisibility.AssistantOnly,
      description: `Use this function to get information about indices/datasets available and the fields available on them.

      providing empty string as index name will retrieve all indices
      else list of all fields for the given index will be given. if no fields are returned this means no indices were matched by provided index pattern.
      wildcards can be part of index name.`,
      descriptionForUser:
        'This function allows the assistant to get information about available indices and their fields.',
      parameters: {
        type: 'object',
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
    async ({ arguments: { index }, messages, connectorId, chat }, signal) => {
      const coreContext = await resources.context.core;

      const esClient = coreContext.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = coreContext.savedObjects.client;

      let indices: string[] = [];

      try {
        const body = await esClient.indices.resolveIndex({
          name: index === '' ? '*' : index,
          expand_wildcards: 'open',
        });
        indices = [
          ...body.indices.map((i) => i.name),
          ...body.data_streams.map((d) => d.name),
          ...body.aliases.map((d) => d.name),
        ];
      } catch (e) {
        indices = [];
      }

      if (index === '') {
        return {
          content: {
            indices,
            fields: [],
          },
        };
      }

      if (indices.length === 0) {
        return {
          content: {
            indices,
            fields: [],
          },
        };
      }

      const fields = await resources.plugins.dataViews
        .start()
        .then((dataViewsStart) =>
          dataViewsStart.dataViewsServiceFactory(savedObjectsClient, esClient)
        )
        .then((service) =>
          service.getFieldsForWildcard({
            pattern: index,
          })
        );

      // else get all the fields for the found dataview
      const response = {
        indices: [index],
        fields: fields.flatMap((field) => {
          return (field.esTypes ?? [field.type]).map((type) => {
            return {
              name: field.name,
              type,
            };
          });
        }),
      };

      const allFields = response.fields;

      const fieldNames = uniq(allFields.map((field) => field.name));

      const groupedFields = groupBy(allFields, (field) => field.name);

      const relevantFields = await Promise.all(
        chunk(fieldNames, 500).map(async (fieldsInChunk) => {
          const chunkResponse$ = (
            await chat('get_relevent_dataset_names', {
              connectorId,
              signal,
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
                    properties: {
                      fields: {
                        type: 'array',
                        items: {
                          type: 'string',
                        },
                      },
                    },
                    required: ['fields'],
                  } as const,
                },
              ],
              functionCall: 'fields',
            })
          ).pipe(concatenateChatCompletionChunks());

          const chunkResponse = await lastValueFrom(chunkResponse$);

          return chunkResponse.message?.function_call?.arguments
            ? (
                JSON.parse(chunkResponse.message.function_call.arguments) as {
                  fields: string[];
                }
              ).fields
                .filter((field) => fieldsInChunk.includes(field))
                .map((field) => {
                  const fieldDescriptors = groupedFields[field];
                  return `${field}:${fieldDescriptors
                    .map((descriptor) => descriptor.type)
                    .join(',')}`;
                })
            : [chunkResponse.message?.content ?? ''];
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
