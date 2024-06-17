/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { omit } from 'lodash';
import { Logger } from '@kbn/logging';
import dedent from 'dedent';
import { lastValueFrom } from 'rxjs';
import { decodeOrThrow, jsonRt } from '@kbn/io-ts-utils';
import { concatenateChatCompletionChunks, Message, MessageRole } from '../../../common';
import type { FunctionCallChatFunction } from '../../service/types';
import type { RetrievedSuggestion } from './types';
import { parseSuggestionScores } from './parse_suggestion_scores';
import { ShortIdTable } from '../../../common/utils/short_id_table';

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

export async function scoreSuggestions({
  suggestions,
  messages,
  userPrompt,
  context,
  chat,
  signal,
  logger,
}: {
  suggestions: RetrievedSuggestion[];
  messages: Message[];
  userPrompt: string;
  context: string;
  chat: FunctionCallChatFunction;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{
  relevantDocuments: RetrievedSuggestion[];
  scores: Array<{ id: string; score: number }>;
}> {
  const shortIdTable = new ShortIdTable();

  const suggestionsWithShortId = suggestions.map((suggestion) => ({
    ...omit(suggestion, 'score', 'id'), // To not bias the LLM
    originalId: suggestion.id,
    shortId: shortIdTable.take(suggestion.id),
  }));

  const newUserMessageContent =
    dedent(`Given the following question, score the documents that are relevant to the question. on a scale from 0 to 7,
    0 being completely irrelevant, and 7 being extremely relevant. Information is relevant to the question if it helps in
    answering the question. Judge it according to the following criteria:

    - The document is relevant to the question, and the rest of the conversation
    - The document has information relevant to the question that is not mentioned,
      or more detailed than what is available in the conversation
    - The document has a high amount of information relevant to the question compared to other documents
    - The document contains new information not mentioned before in the conversation

    User prompt:
    ${userPrompt}

    Context:
    ${context}

    Documents:
    ${JSON.stringify(
      suggestionsWithShortId.map((suggestion) => ({
        id: suggestion.shortId,
        content: suggestion.text,
      })),
      null,
      2
    )}`);

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
  };

  const response = await lastValueFrom(
    chat('score_suggestions', {
      messages: [...messages.slice(0, -2), newUserMessage],
      functions: [scoreFunction],
      functionCall: 'score',
      signal,
    }).pipe(concatenateChatCompletionChunks())
  );

  const scoreFunctionRequest = decodeOrThrow(scoreFunctionRequestRt)(response);
  const { scores: scoresAsString } = decodeOrThrow(jsonRt.pipe(scoreFunctionArgumentsRt))(
    scoreFunctionRequest.message.function_call.arguments
  );

  const scores = parseSuggestionScores(scoresAsString).map(({ id, score }) => {
    const originalSuggestion = suggestionsWithShortId.find(
      (suggestion) => suggestion.shortId === id
    );
    return {
      originalId: originalSuggestion?.originalId,
      score,
    };
  });

  if (scores.length === 0) {
    // seemingly invalid or no scores, return all
    return { relevantDocuments: suggestions, scores: [] };
  }

  const suggestionIds = suggestions.map((document) => document.id);

  const relevantDocumentIds = scores
    .filter((document) => suggestionIds.includes(document.originalId ?? '')) // Remove hallucinated documents
    .filter((document) => document.score > 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((document) => document.originalId);

  const relevantDocuments = suggestions.filter((suggestion) =>
    relevantDocumentIds.includes(suggestion.id)
  );

  logger.debug(`Relevant documents: ${JSON.stringify(relevantDocuments, null, 2)}`);

  return {
    relevantDocuments,
    scores: scores.map((score) => ({ id: score.originalId!, score: score.score })),
  };
}
