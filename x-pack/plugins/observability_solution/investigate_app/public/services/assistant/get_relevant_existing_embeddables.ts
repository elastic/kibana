/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatCompletionChunkEvent,
  concatenateChatCompletionChunks,
  FunctionDefinition,
  Message,
  MessageRole,
  ShortIdTable,
} from '@kbn/observability-ai-assistant-plugin/public';
import { compact, keyBy } from 'lodash';
import { from, last, lastValueFrom, map, mergeMap, Observable, toArray } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { InvestigateAppAPIClient } from '../../api';
import { StoredEmbeddable } from './get_stored_embeddables';
import { SYSTEM_MESSAGE } from './system_message';

const MAX_CONCURRENT_REQUESTS = 4;

const SELECT_FUNCTION_NAME = 'select_relevant_visualizations';

export async function getRelevantExistingEmbeddables({
  storedEmbeddables,
  chat,
  context,
  prompt,
  signal,
  apiClient,
  logger,
}: {
  storedEmbeddables: StoredEmbeddable[];
  chat: (
    name: string,
    options: {
      signal: AbortSignal;
      messages: Message[];
      functionCall?: string;
      functions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
    }
  ) => Observable<ChatCompletionChunkEvent>;
  context: string;
  prompt: string;
  signal: AbortSignal;
  apiClient: InvestigateAppAPIClient;
  logger: Logger;
}): Promise<StoredEmbeddable[]> {
  const shortIdTable = new ShortIdTable();

  const objectsForLlm = storedEmbeddables.map((storedEmbeddable) => {
    const { id, type, title, description } = storedEmbeddable;
    return {
      id: shortIdTable.take(id),
      type,
      title,
      description,
    };
  });

  const { chunks } = await apiClient(
    'POST /internal/investigate_app/assistant/chunk_on_token_count',
    {
      params: {
        body: {
          maxTokenCount: 16000,
          context,
          parts: objectsForLlm.map(
            (object) => `### Title: ${object.title}
          
          ID: ${object.id}
          Type: ${object.type}
          ${object.description ? `Description: ${object.description}` : ''}
          
          `
          ),
        },
      },
      signal,
    }
  );

  const allIds = await lastValueFrom(
    from(chunks).pipe(
      mergeMap((stringifiedObjects) => {
        return chat('select_relevant_visualizations', {
          signal,
          messages: [
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.System,
                content: `${SYSTEM_MESSAGE}
  
                  ## Selecting relevant visualizations
                  
                  The first step in this progress is to select any visualizations that might be
                  relevant to the user's question. Further in the process, you can either add
                  these visualizations, or inspect them further so you can make changes to them
                  based on what the user has requested, and what is already available in the timeline.
                  
                  The following context is available:
                  
                  ${context}`,
              },
            },
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                content: `Based on the context that is available in the conversation, and the user's prompt,
                  select the relevant visualizations, using the ${SELECT_FUNCTION_NAME} function.

                  Select anywhere between 3 to 8 visualizations. Prefer to select more than less. Any
                  selected visualizations will simply be given as context to the next step in the process,
                  which is to generate new widgets, which could be based on these existing visualizations.
                  
                  ## Prompt
  
                  User: ${prompt}
  
                  ## Visualizations
  
                  ${stringifiedObjects.join('\n\n')}
  
                  `,
              },
            },
          ],
          functionCall: SELECT_FUNCTION_NAME,
          functions: [
            {
              name: SELECT_FUNCTION_NAME,
              description: 'Use this function to select the relevant visualizations',
              parameters: {
                type: 'object',
                properties: {
                  ids: {
                    type: 'array',
                    items: {
                      type: 'string',
                      description: 'The ids of the documents',
                    },
                  },
                },
              },
            },
          ],
        }).pipe(
          concatenateChatCompletionChunks(),
          last(),
          map((concatenatedMessage) => {
            if (!concatenatedMessage.message.function_call.name) {
              throw new Error(
                `Unexpected response without function call: ${JSON.stringify(concatenatedMessage)}`
              );
            }

            const response = JSON.parse(concatenatedMessage.message.function_call.arguments) as {
              ids: string[];
            };

            return response.ids;
          })
        );
      }, MAX_CONCURRENT_REQUESTS),
      toArray()
    )
  );

  const flattenedIds = allIds.flat();

  const storedEmbeddablesById = keyBy(storedEmbeddables, (storedEmbeddable) => storedEmbeddable.id);

  const relevantEmbeddables = compact(
    flattenedIds.map((id) => {
      const originalId = shortIdTable.lookup(id);
      if (originalId) {
        return storedEmbeddablesById[originalId];
      }
      return undefined;
    })
  ).filter((storedEmbeddable) => !!storedEmbeddable.title);

  return relevantEmbeddables;
}
