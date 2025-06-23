/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, isToolMessage } from '@langchain/core/messages';
import { isContentResultTransportFormat, ToolContentResult } from '@kbn/wci-server';
import { extractTextContent } from '../../../utils/from_langchain_messages';

export interface ToolMessageResult {
  toolCallId: string;
  result: string;
}

/**
 * Extract the tool results from all tool messages from the provided list of messages
 */
export const extractToolResults = (messages: BaseMessage[]): ToolMessageResult[] => {
  return messages.filter(isToolMessage).map((message) => ({
    toolCallId: message.tool_call_id,
    result: extractTextContent(message),
  }));
};

export const processSearchResults = (messages: BaseMessage[]) => {
  const toolResults = extractToolResults(messages);

  const results: ToolContentResult[] = [];
  const unknownResults: unknown[] = [];

  toolResults.forEach(({ result }) => {
    const parsed = JSON.parse(result);
    if (parsed.content && Array.isArray(parsed.content)) {
      parsed.content.forEach((content: unknown) => {
        if (isContentResultTransportFormat(content)) {
          const parsedContent: ToolContentResult = {
            reference: content.reference,
            content: JSON.parse(content.text),
          };
          results.push(parsedContent);
        } else {
          unknownResults.push(content);
        }
      });
    }
  });

  return {
    results,
    unknownResults,
  };
};

export interface Rating {
  id: string;
  score: number;
}

export const parseRatings = (rawRatings: string[]): Rating[] => {
  return rawRatings.map<Rating>((rating) => {
    const parts = rating.split('|');
    return {
      id: parts[0],
      score: parseInt(parts[1], 10),
    };
  });
};

export const processRatings = ({
  results,
  ratings,
  maxResults,
  minScore,
}: {
  results: ToolContentResult[];
  ratings: Rating[];
  minScore: number;
  maxResults: number;
}): ToolContentResult[] => {
  interface ResultWithRating {
    result: ToolContentResult;
    score: number;
  }

  const resultsWithRatings = results.map<ResultWithRating>((result, index) => {
    const rating = ratings.find((r) => r.id === `${index}`);
    return {
      result,
      score: rating?.score ?? 0,
    };
  });

  // TODO: handle maxResults
  return resultsWithRatings
    .filter((result) => result.score >= minScore)
    .map((result) => result.result);
};
