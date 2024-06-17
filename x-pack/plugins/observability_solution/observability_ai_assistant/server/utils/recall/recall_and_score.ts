/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { AnalyticsServiceStart } from '@kbn/core/server';
import type { Message } from '../../../common';
import type { ObservabilityAIAssistantClient } from '../../service/client';
import type { FunctionCallChatFunction } from '../../service/types';
import { retrieveSuggestions } from './retrieve_suggestions';
import { scoreSuggestions } from './score_suggestions';
import type { RetrievedSuggestion } from './types';
import { RecallRanking, RecallRankingEventType } from '../../analytics/recall_ranking';

export async function recallAndScore({
  recall,
  chat,
  analytics,
  userPrompt,
  context,
  messages,
  logger,
  signal,
}: {
  recall: ObservabilityAIAssistantClient['recall'];
  chat: FunctionCallChatFunction;
  analytics: AnalyticsServiceStart;
  userPrompt: string;
  context: string;
  messages: Message[];
  logger: Logger;
  signal: AbortSignal;
}): Promise<{
  relevantDocuments?: RetrievedSuggestion[];
  scores?: Array<{ id: string; score: number }>;
  suggestions: RetrievedSuggestion[];
}> {
  const queries = [
    { text: userPrompt, boost: 3 },
    { text: context, boost: 1 },
  ].filter((query) => query.text.trim());

  const suggestions = await retrieveSuggestions({
    recall,
    queries,
  });

  if (!suggestions.length) {
    return {
      relevantDocuments: [],
      scores: [],
      suggestions: [],
    };
  }

  try {
    const { scores, relevantDocuments } = await scoreSuggestions({
      suggestions,
      logger,
      messages,
      userPrompt,
      context,
      signal,
      chat,
    });

    analytics.reportEvent<RecallRanking>(RecallRankingEventType, {
      prompt: queries.map((query) => query.text).join('\n\n'),
      scoredDocuments: suggestions.map((suggestion) => {
        const llmScore = scores.find((score) => score.id === suggestion.id);
        return {
          content: suggestion.text,
          elserScore: suggestion.score ?? -1,
          llmScore: llmScore ? llmScore.score : -1,
        };
      }),
    });

    return { scores, relevantDocuments, suggestions };
  } catch (error) {
    logger.error(`Error scoring documents: ${error.message}`, { error });
    return {
      suggestions: suggestions.slice(0, 5),
    };
  }
}
