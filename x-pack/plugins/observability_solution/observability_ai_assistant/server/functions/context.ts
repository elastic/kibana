/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import { encode } from 'gpt-tokenizer';
import { compact, last } from 'lodash';
import { Observable } from 'rxjs';
import { FunctionRegistrationParameters } from '.';
import { MessageAddEvent } from '../../common/conversation_complete';
import { FunctionVisibility } from '../../common/functions/types';
import { MessageRole } from '../../common/types';
import { createFunctionResponseMessage } from '../../common/utils/create_function_response_message';
import { recallAndScore } from '../utils/recall/recall_and_score';

const MAX_TOKEN_COUNT_FOR_DATA_ON_SCREEN = 1000;

export function registerContextFunction({
  client,
  functions,
  resources,
  isKnowledgeBaseAvailable,
}: FunctionRegistrationParameters & { isKnowledgeBaseAvailable: boolean }) {
  functions.registerFunction(
    {
      name: 'context',
      description:
        'This function provides context as to what the user is looking at on their screen, and recalled documents from the knowledge base that matches their query',
      visibility: FunctionVisibility.Internal,
      parameters: {
        type: 'object',
        properties: {
          queries: {
            type: 'array',
            description: 'The query for the semantic search',
            items: {
              type: 'string',
            },
          },
          categories: {
            type: 'array',
            description:
              'Categories of internal documentation that you want to search for. By default internal documentation will be excluded. Use `apm` to get internal APM documentation, `lens` to get internal Lens documentation, or both.',
            items: {
              type: 'string',
              enum: ['apm', 'lens'],
            },
          },
        },
        required: ['queries', 'categories'],
      } as const,
    },
    async ({ arguments: args, messages, screenContexts, chat }, signal) => {
      const { analytics } = (await resources.context.core).coreStart;

      const { queries } = args;

      async function getContext() {
        const screenDescription = compact(
          screenContexts.map((context) => context.screenDescription)
        ).join('\n\n');
        // any data that falls within the token limit, send it automatically

        const dataWithinTokenLimit = compact(
          screenContexts.flatMap((context) => context.data)
        ).filter(
          (data) => encode(JSON.stringify(data.value)).length <= MAX_TOKEN_COUNT_FOR_DATA_ON_SCREEN
        );

        const content = {
          screen_description: screenDescription,
          learnings: [],
          ...(dataWithinTokenLimit.length ? { data_on_screen: dataWithinTokenLimit } : {}),
        };

        if (!isKnowledgeBaseAvailable) {
          return { content };
        }

        const userMessage = last(
          messages.filter((message) => message.message.role === MessageRole.User)
        );

        const nonEmptyQueries = compact(queries);

        const queriesOrUserPrompt = nonEmptyQueries.length
          ? nonEmptyQueries
          : compact([userMessage?.message.content]);

        const { scores, relevantDocuments, suggestions } = await recallAndScore({
          recall: client.recall,
          chat,
          logger: resources.logger,
          prompt: queriesOrUserPrompt.join('\n\n'),
          context: screenDescription,
          messages,
          signal,
          analytics,
        });

        return {
          content: { ...content, learnings: relevantDocuments as unknown as Serializable },
          data: {
            scores,
            suggestions,
          },
        };
      }

      return new Observable<MessageAddEvent>((subscriber) => {
        getContext()
          .then(({ content, data }) => {
            subscriber.next(
              createFunctionResponseMessage({
                name: 'context',
                content,
                data,
              })
            );

            subscriber.complete();
          })
          .catch((error) => {
            subscriber.error(error);
          });
      });
    }
  );
}
