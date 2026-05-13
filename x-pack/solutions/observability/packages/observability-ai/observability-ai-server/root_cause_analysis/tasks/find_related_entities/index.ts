/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DocumentAnalysis,
  FieldPatternResultWithChanges,
  FormattedDocumentAnalysis,
} from '@kbn/ai-tools';
import type { InferenceClient } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { ScoredKnowledgeBaseEntry } from '../get_knowledge_base_entries';
import type { RelatedEntityFromSearchResults } from './analyze_fetched_related_entities';
import { analyzeFetchedRelatedEntities } from './analyze_fetched_related_entities';
import type { RelatedEntityKeywordSearch } from './write_keyword_searches_for_related_entities';
import { writeKeywordSearchForRelatedEntities } from './write_keyword_searches_for_related_entities';

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
    truncated: FormattedDocumentAnalysis;
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
