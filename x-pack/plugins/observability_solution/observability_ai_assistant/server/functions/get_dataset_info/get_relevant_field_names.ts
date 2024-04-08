/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { chunk, groupBy, uniq } from 'lodash';
import { lastValueFrom, Observable } from 'rxjs';
import type { ObservabilityAIAssistantClient } from '../../service/client';
import { type ChatCompletionChunkEvent, type Message, MessageRole } from '../../../common';
import { concatenateChatCompletionChunks } from '../../../common/utils/concatenate_chat_completion_chunks';

export async function getRelevantFieldNames({
  index,
  start,
  end,
  dataViews,
  esClient,
  savedObjectsClient,
  chat,
  messages,
}: {
  index: string | string[];
  start?: string;
  end?: string;
  dataViews: DataViewsServerPluginStart;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  messages: Message[];
  chat: (
    name: string,
    {}: Pick<
      Parameters<ObservabilityAIAssistantClient['chat']>[1],
      'functionCall' | 'functions' | 'messages'
    >
  ) => Promise<Observable<ChatCompletionChunkEvent>>;
}): Promise<{ fields: string[] }> {
  const dataViewsService = await dataViews.dataViewsServiceFactory(savedObjectsClient, esClient);

  const fields = await dataViewsService.getFieldsForWildcard({
    pattern: index,
    allowNoIndex: true,
    indexFilter:
      start && end
        ? {
            range: {
              '@timestamp': {
                gte: datemath.parse(start)!.toISOString(),
                lt: datemath.parse(end)!.toISOString(),
              },
            },
          }
        : undefined,
  });

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
              return `${field}:${fieldDescriptors.map((descriptor) => descriptor.type).join(',')}`;
            })
        : [chunkResponse.message?.content ?? ''];
    })
  );

  return { fields: relevantFields.flat() };
}
