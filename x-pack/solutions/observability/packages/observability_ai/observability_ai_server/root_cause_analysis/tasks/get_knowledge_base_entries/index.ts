/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ShortIdTable } from '@kbn/observability-ai-assistant-plugin/common';
import { decode, encode } from 'gpt-tokenizer';
import { orderBy, sumBy } from 'lodash';
import { RCA_SYSTEM_PROMPT_BASE } from '../../prompts';
import { RootCauseAnalysisContext } from '../../types';
import { formatEntity } from '../../util/format_entity';
import { toBlockquote } from '../../util/to_blockquote';

export interface ScoredKnowledgeBaseEntry {
  id: string;
  text: string;
  tokens: number;
  score: number;
  truncated?: {
    tokens: number;
    text: string;
  };
}

export async function getKnowledgeBaseEntries({
  entity,
  context,
  rcaContext,
  maxTokens: maxTokensForEntries,
}: {
  entity: Record<string, string>;
  context: string;
  rcaContext: RootCauseAnalysisContext;
  maxTokens: number;
}): Promise<ScoredKnowledgeBaseEntry[]> {
  const response = await rcaContext.observabilityAIAssistantClient.recall({
    queries: [
      ...Object.values(entity).map((value) => ({ text: value, boost: 3 })),
      { text: context },
    ],
    limit: {
      tokenCount: Number.MAX_VALUE,
    },
  });

  const { inferenceClient, connectorId } = rcaContext;

  const shortIdTable = new ShortIdTable();

  const system = RCA_SYSTEM_PROMPT_BASE;

  const input = `Re-order the attached documents, based on relevance to the context.
  Score them between 1 and 5, based on their relative relevance to each other. The
  most relevant doc should be scored 5, and the least relevant doc should be scored
  1.

  # Entity

  ${formatEntity(entity)}
  
  # Context

  ${toBlockquote(context)}
  `;

  const maxTokensForScoring = rcaContext.tokenLimit - encode(system + input).length - 1_000;

  const entriesWithTokens = response.map((entry) => {
    return {
      id: entry.id,
      text: entry.text,
      tokens: encode(entry.text),
    };
  });

  const totalTokenCount = sumBy(entriesWithTokens, (entry) => entry.tokens.length);

  const truncatedEntriesWithShortIds = entriesWithTokens.map((entry) => {
    const tokensForEntry = Math.floor(
      (entry.tokens.length / totalTokenCount) * maxTokensForScoring
    );

    const truncatedText = decode(entry.tokens.slice(0, tokensForEntry));
    const isTruncated = tokensForEntry < entry.tokens.length;

    return {
      id: entry.id,
      tokens: entry.tokens,
      shortId: shortIdTable.take(entry.id),
      text: entry.text,
      truncatedText,
      isTruncated,
    };
  });

  const scoredEntries = await inferenceClient.output({
    id: 'score_entries',
    connectorId,
    system: RCA_SYSTEM_PROMPT_BASE,
    input: `${input}
        
        ${truncatedEntriesWithShortIds
          .map((entry) => {
            return `# ID: ${entry.shortId}
          
          ## Text (${entry.isTruncated ? `truncated` : `not truncated `})

          ${toBlockquote(entry.truncatedText)}
          `;
          })
          .join('\n\n')}
        `,
    stream: false,
    schema: {
      type: 'object',
      properties: {
        docs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              score: {
                type: 'number',
                description:
                  'A score between 1 and 5, with 5 being most relevant, and 1 being least relevant',
              },
              id: {
                type: 'string',
              },
            },
            required: ['score', 'id'],
          },
        },
      },
      required: ['docs'],
    },
  } as const);

  const scoresById = new Map(scoredEntries.output.docs.map((doc) => [doc.id, doc.score]));

  const entriesWithScore = truncatedEntriesWithShortIds.map((entry) => {
    const score = scoresById.get(entry.shortId) ?? 0;
    return {
      ...entry,
      score,
    };
  });

  const sortedEntries = orderBy(entriesWithScore, (entry) => entry.score, 'desc');

  const returnedEntries: ScoredKnowledgeBaseEntry[] = [];

  const tokensLeft = maxTokensForEntries;

  sortedEntries.forEach((entry) => {
    if (entry.tokens.length <= tokensLeft) {
      returnedEntries.push({
        id: entry.id,
        text: entry.text,
        tokens: entry.tokens.length,
        score: entry.score,
      });
      return;
    }

    const tokensToTake = tokensLeft;
    if (tokensToTake > 0) {
      const tookTokens = entry.tokens.slice(0, tokensToTake);
      returnedEntries.push({
        id: entry.id,
        text: entry.text,
        tokens: entry.tokens.length,
        score: entry.score,
        truncated: {
          text: decode(tookTokens),
          tokens: tookTokens.length,
        },
      });
    }
  });

  return returnedEntries;
}
