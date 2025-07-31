/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TruncatedDocumentAnalysis } from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import { FieldPatternResultWithChanges } from '@kbn/observability-utils-server/entities/get_log_patterns';
import { InferenceClient } from '@kbn/inference-common';
import { RCA_SYSTEM_PROMPT_BASE } from '../../prompts';
import { formatEntity } from '../../util/format_entity';
import { serializeKnowledgeBaseEntries } from '../../util/serialize_knowledge_base_entries';
import { ScoredKnowledgeBaseEntry } from '../get_knowledge_base_entries';
import { getInvestigateEntityTaskPrompt } from '../investigate_entity/prompts';

export async function describeEntity({
  inferenceClient,
  connectorId,
  entity,
  contextForEntityInvestigation,
  analysis,
  ownPatterns,
  kbEntries,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
  entity: Record<string, string>;
  analysis: TruncatedDocumentAnalysis;
  contextForEntityInvestigation: string;
  ownPatterns: FieldPatternResultWithChanges[];
  kbEntries: ScoredKnowledgeBaseEntry[];
}) {
  const system = RCA_SYSTEM_PROMPT_BASE;

  const input = `${getInvestigateEntityTaskPrompt({ entity, contextForEntityInvestigation })}

    ## Context for investigating ${formatEntity(entity)}

    ${contextForEntityInvestigation}

    ${serializeKnowledgeBaseEntries(kbEntries)}

    ## Data samples

    ${JSON.stringify(analysis)}

    ## Log patterns

    ${JSON.stringify(ownPatterns.map(({ regex, sample }) => ({ regex, sample })))}

    ## Current task

    Describe the entity characteristics based on the sample documents and log
    patterns. Put it in context of the investigation process. Mention the reason
    why it's being investigated, and how it is related other entities that were
    previously investigated. Mention these three things:

    - infrastructure & environment
    - communication characteristics (protocols and endpoints)
    - context of entity in investigation

    You shouldn't mention the log patterns, they will be analyzed elsewhere.
  `;

  const response = await inferenceClient.output({
    id: 'describe_entity',
    connectorId,
    system,
    input,
  });

  return response.content;
}
