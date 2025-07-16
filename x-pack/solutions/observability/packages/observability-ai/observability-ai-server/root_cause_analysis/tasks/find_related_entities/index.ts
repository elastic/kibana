/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentAnalysis, TruncatedDocumentAnalysis } from '@kbn/ai-tools';
import type { FieldPatternResultWithChanges } from '@kbn/genai-utils-server/log_patterns/get_log_patterns';
import { InferenceClient } from '@kbn/inference-common';
import { Logger } from '@kbn/logging';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { ScoredKnowledgeBaseEntry } from '../get_knowledge_base_entries';
import {
  RelatedEntityFromSearchResults,
  analyzeFetchedRelatedEntities,
} from './analyze_fetched_related_entities';
import {
  RelatedEntityKeywordSearch,
  writeKeywordSearchForRelatedEntities,
} from './write_keyword_searches_for_related_entities';

export type { RelatedEntityFromSearchResults };

export async function findRelatedEntities({
  connectorId,
  inferenceClient,
  start,
  end,
  index,
  esClient,
  entity,
  analysis,
  logger,
  context,
  ownPatterns,
  patternsFromOtherEntities,
  kbEntries,
}: {
  connectorId: string;
  inferenceClient: InferenceClient;
  start: number;
  end: number;
  index: string | string[];
  esClient: TracedElasticsearchClient;
  entity: Record<string, string>;
  analysis: {
    truncated: TruncatedDocumentAnalysis;
    full: DocumentAnalysis;
  };
  logger: Logger;
  context: string;
  ownPatterns: FieldPatternResultWithChanges[];
  patternsFromOtherEntities: FieldPatternResultWithChanges[];
  kbEntries: ScoredKnowledgeBaseEntry[];
}): Promise<{
  searches: RelatedEntityKeywordSearch[];
  summaries: string[];
  foundEntities: RelatedEntityFromSearchResults[];
}> {
  const { groupingFields, searches } = await writeKeywordSearchForRelatedEntities({
    connectorId,
    inferenceClient,
    entity,
    analysis: analysis.truncated,
    ownPatterns,
    context,
    kbEntries,
  });

  const { summaries, foundEntities } = await analyzeFetchedRelatedEntities({
    entity,
    connectorId,
    start,
    end,
    esClient,
    index,
    inferenceClient,
    searches,
    groupingFields,
    logger,
    analysis,
    ownPatterns,
    patternsFromOtherEntities,
    context,
    kbEntries,
  });

  return {
    searches,
    summaries,
    foundEntities,
  };
}
