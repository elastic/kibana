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
import { compact, last, omit } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { FunctionRegistrationParameters } from '.';
import { MessageRole, type Message } from '../../common/types';
import { concatenateOpenAiChunks } from '../../common/utils/concatenate_openai_chunks';
import { processOpenAiStream } from '../../common/utils/process_openai_stream';
import type { ObservabilityAIAssistantClient } from '../service/client';
import { streamIntoObservable } from '../service/util/stream_into_observable';
import { parseSuggestionScores } from './parse_suggestion_scores';

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

      const nonEmptyQueries = compact(queries);

      const queriesOrUserPrompt = nonEmptyQueries.length
        ? nonEmptyQueries
        : compact([userMessage?.message.content]);

      const suggestions = await retrieveSuggestions({
        userMessage,
        client,
        contexts,
        queries: queriesOrUserPrompt,
      });

      resources.logger.debug(`Received ${suggestions.length} suggestions`);

      resources.logger.debug(JSON.stringify(suggestions, null, 2));

      const { relevantDocuments, scores } = await scoreSuggestions({
        suggestions,
        queries: queriesOrUserPrompt,
        messages,
        client,
        connectorId,
        signal,
      });

      if (scores.length === 0) {
        return {
          content: { learnings: relevantDocuments as unknown as Serializable },
          data: {
            scores,
            suggestions,
          },
        };
      }

      resources.logger.debug(`Received ${relevantDocuments.length} relevant documents`);
      resources.logger.debug(JSON.stringify(relevantDocuments, null, 2));

      return {
        content: { learnings: relevantDocuments as unknown as Serializable },
      };
    }
  );
}

async function retrieveSuggestions({
  queries,
  client,
  contexts,
}: {
  userMessage?: Message;
  queries: string[];
  client: ObservabilityAIAssistantClient;
  contexts: Array<'apm' | 'lens'>;
}) {
  const recallResponse = await client.recall({
    queries,
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
  scores: t.string,
});

async function scoreSuggestions({
  suggestions,
  messages,
  queries,
  client,
  connectorId,
  signal,
}: {
  suggestions: Awaited<ReturnType<typeof retrieveSuggestions>>;
  messages: Message[];
  queries: string[];
  client: ObservabilityAIAssistantClient;
  connectorId: string;
  signal: AbortSignal;
}) {
  const indexedSuggestions = suggestions.map((suggestion, index) => ({ ...suggestion, id: index }));

  const newUserMessageContent =
    dedent(`Given the following question, score the documents that are relevant to the question. on a scale from 0 to 7,
    0 being completely relevant, and 7 being extremely relevant. Information is relevant to the question if it helps in
    answering the question. Judge it according to the following criteria:

    - The document is relevant to the question, and the rest of the conversation
    - The document has information relevant to the question that is not mentioned,
      or more detailed than what is available in the conversation
    - The document has a high amount of information relevant to the question compared to other documents
    - The document contains new information not mentioned before in the conversation

    Question:
    ${queries.join('\n')}

    Documents:
    ${JSON.stringify(indexedSuggestions, null, 2)}`);

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
          description: `The document IDs and their scores, as CSV. Example:
          
            my_id,7
            my_other_id,3
            my_third_id,4
          `,
          type: 'string',
        },
      },
      required: ['score'],
    } as const,
    contexts: ['core'],
  };

  const response = await lastValueFrom(
    streamIntoObservable(
      await client.chat({
        connectorId,
        messages: [...messages.slice(0, -1), newUserMessage],
        functions: [scoreFunction],
        functionCall: 'score',
        signal,
      })
    ).pipe(processOpenAiStream(), concatenateOpenAiChunks())
  );
  const scoreFunctionRequest = decodeOrThrow(scoreFunctionRequestRt)(response);
  const { scores: scoresAsString } = decodeOrThrow(jsonRt.pipe(scoreFunctionArgumentsRt))(
    scoreFunctionRequest.message.function_call.arguments
  );

  const scores = parseSuggestionScores(scoresAsString).map(({ index, score }) => {
    return {
      id: suggestions[index].id,
      score,
    };
  });

  if (scores.length === 0) {
    // seemingly invalid or no scores, return all
    return { relevantDocuments: suggestions, scores: [] };
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

  return { relevantDocuments, scores };
}
