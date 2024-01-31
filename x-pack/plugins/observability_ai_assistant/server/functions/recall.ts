/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeOrThrow, jsonRt } from '@kbn/io-ts-utils';
import type { Serializable } from '@kbn/utility-types';
import dedent from 'dedent';
import * as t from 'io-ts';
import { last, omit } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { FunctionRegistrationParameters } from '.';
import { MessageRole, type Message } from '../../common/types';
import { concatenateChatCompletionChunks } from '../../common/utils/concatenate_chat_completion_chunks';
import type { ObservabilityAIAssistantClient } from '../service/client';

export function registerRecallFunction({
  client,
  registerFunction,
  resources,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'recall',
      contexts: ['core'],
      description: `Use this function to recall earlier learnings. Anything you will summarize can be retrieved again later via this function.
      
      The learnings are sorted by score, descending.
      
      Make sure the query covers ONLY the following aspects:
      - Anything you've inferred from the user's request, but is not mentioned in the user's request
      - The functions you think might be suitable for answering the user's request. If there are multiple functions that seem suitable, create multiple queries. Use the function name in the query.  

      DO NOT include the user's request. It will be added internally.
      
      The user asks: "can you visualise the average request duration for opbeans-go over the last 7 days?"
      You recall: {
        "queries": [
          "APM service,
          "lens function usage",
          "get_apm_timeseries function usage"    
        ],
        "contexts": [
          "lens",
          "apm"
        ]
      }`,
      descriptionForUser: 'This function allows the assistant to recall previous learnings.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          queries: {
            type: 'array',
            additionalItems: false,
            additionalProperties: false,
            description: 'The query for the semantic search',
            items: {
              type: 'string',
            },
          },
          contexts: {
            type: 'array',
            additionalItems: false,
            additionalProperties: false,
            description:
              'Contexts or categories of internal documentation that you want to search for. By default internal documentation will be excluded. Use `apm` to get internal APM documentation, `lens` to get internal Lens documentation, or both.',
            items: {
              type: 'string',
              enum: ['apm', 'lens'],
            },
          },
        },
        required: ['queries', 'contexts'],
      } as const,
    },
    async ({ arguments: { queries, contexts }, messages, connectorId }, signal) => {
      const systemMessage = messages.find((message) => message.message.role === MessageRole.System);

      if (!systemMessage) {
        throw new Error('No system message found');
      }

      const userMessage = last(
        messages.filter((message) => message.message.role === MessageRole.User)
      );

      const suggestions = await retrieveSuggestions({
        userMessage,
        client,
        signal,
        contexts,
        queries,
      });

      resources.logger.debug(`Received ${suggestions.length} suggestions`);

      resources.logger.debug(JSON.stringify(suggestions, null, 2));

      if (suggestions.length === 0) {
        return {
          content: [] as unknown as Serializable,
        };
      }

      const relevantDocuments = await scoreSuggestions({
        suggestions,
        systemMessage,
        userMessage,
        queries,
        client,
        connectorId,
        signal,
      });

      resources.logger.debug(`Received ${relevantDocuments.length} relevant documents`);
      resources.logger.debug(JSON.stringify(relevantDocuments, null, 2));

      return {
        content: relevantDocuments as unknown as Serializable,
      };
    }
  );
}

async function retrieveSuggestions({
  userMessage,
  queries,
  client,
  contexts,
  signal,
}: {
  userMessage?: Message;
  queries: string[];
  client: ObservabilityAIAssistantClient;
  contexts: Array<'apm' | 'lens'>;
  signal: AbortSignal;
}) {
  const queriesWithUserPrompt =
    userMessage && userMessage.message.content
      ? [userMessage.message.content, ...queries]
      : queries;

  const recallResponse = await client.recall({
    queries: queriesWithUserPrompt,
    contexts,
  });

  return recallResponse.entries.map((entry) => omit(entry, 'labels', 'is_correction', 'score'));
}

const scoreFunctionRequestRt = t.type({
  message: t.type({
    function_call: t.type({
      name: t.literal('score'),
      arguments: t.string,
    }),
  }),
});

const scoreFunctionArgumentsRt = t.type({
  scores: t.array(
    t.type({
      id: t.string,
      score: t.number,
    })
  ),
});

async function scoreSuggestions({
  suggestions,
  systemMessage,
  userMessage,
  queries,
  client,
  connectorId,
  signal,
}: {
  suggestions: Awaited<ReturnType<typeof retrieveSuggestions>>;
  systemMessage: Message;
  userMessage?: Message;
  queries: string[];
  client: ObservabilityAIAssistantClient;
  connectorId: string;
  signal: AbortSignal;
}) {
  const systemMessageExtension =
    dedent(`You have the function called score available to help you inform the user about how relevant you think a given document is to the conversation.
    Please give a score between 1 and 7, fractions are allowed.
    A higher score means it is more relevant.`);
  const extendedSystemMessage = {
    ...systemMessage,
    message: {
      ...systemMessage.message,
      content: `${systemMessage.message.content}\n\n${systemMessageExtension}`,
    },
  };

  const userMessageOrQueries =
    userMessage && userMessage.message.content ? userMessage.message.content : queries.join(',');

  const newUserMessageContent =
    dedent(`Given the question "${userMessageOrQueries}", can you give me a score for how relevant the following documents are?

  ${JSON.stringify(suggestions, null, 2)}`);

  const newUserMessage: Message = {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.User,
      content: newUserMessageContent,
    },
  };

  const scoreFunction = {
    name: 'score',
    description:
      'Use this function to score documents based on how relevant they are to the conversation.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        scores: {
          description: 'The document IDs and their scores',
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: {
                description: 'The ID of the document',
                type: 'string',
              },
              score: {
                description: 'The score for the document',
                type: 'number',
              },
            },
          },
        },
      },
      required: ['score'],
    } as const,
    contexts: ['core'],
  };

  const response = await lastValueFrom(
    (
      await client.chat({
        connectorId,
        messages: [extendedSystemMessage, newUserMessage],
        functions: [scoreFunction],
        functionCall: 'score',
        signal,
      })
    ).pipe(concatenateChatCompletionChunks())
  );
  const scoreFunctionRequest = decodeOrThrow(scoreFunctionRequestRt)(response);
  const { scores } = decodeOrThrow(jsonRt.pipe(scoreFunctionArgumentsRt))(
    scoreFunctionRequest.message.function_call.arguments
  );

  if (scores.length === 0) {
    return [];
  }

  const suggestionIds = suggestions.map((document) => document.id);

  const relevantDocumentIds = scores
    .filter((document) => suggestionIds.includes(document.id)) // Remove hallucinated documents
    .filter((document) => document.score > 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((document) => document.id);

  const relevantDocuments = suggestions.filter((suggestion) =>
    relevantDocumentIds.includes(suggestion.id)
  );

  return relevantDocuments;
}
