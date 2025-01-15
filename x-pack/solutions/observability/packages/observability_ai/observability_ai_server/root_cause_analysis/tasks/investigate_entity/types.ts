/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { TruncatedDocumentAnalysis } from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import type { AnalyzeLogPatternOutput } from '../analyze_log_patterns';
import type { RelatedEntityDescription } from '../find_related_entities/extract_related_entities';
import type { RelatedEntityKeywordSearch } from '../find_related_entities/write_keyword_searches_for_related_entities';
import type { ScoredKnowledgeBaseEntry } from '../get_knowledge_base_entries';

export interface EntityInvestigation {
  entity: Record<string, string>;
  summary: string;
  relatedEntities: RelatedEntityDescription[];
  attachments: {
    analysis: TruncatedDocumentAnalysis;
    slos: Array<
      Record<string, any> & {
        status: 'VIOLATED' | 'DEGRADED' | 'HEALTHY' | 'NO_DATA';
      }
    >;
    alerts: ParsedTechnicalFields[];
    searches: RelatedEntityKeywordSearch[];
    relatedEntitiesSummaries: string[];
    kbEntries: ScoredKnowledgeBaseEntry[];
  } & AnalyzeLogPatternOutput;
}
