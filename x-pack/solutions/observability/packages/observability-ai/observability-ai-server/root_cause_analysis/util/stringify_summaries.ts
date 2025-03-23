/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { MessageRole } from '@kbn/inference-common';
import { RCA_OBSERVE_TOOL_NAME } from '@kbn/observability-ai-common/root_cause_analysis';
import { formatEntity } from './format_entity';
import { toBlockquote } from './to_blockquote';
import { ObservationToolMessage, RootCauseAnalysisContext } from '../types';

export function stringifySummaries({ events }: RootCauseAnalysisContext): string {
  const summaries = events
    .filter((event): event is ObservationToolMessage => {
      return event.role === MessageRole.Tool && event.name === RCA_OBSERVE_TOOL_NAME;
    })
    .map((event) => event.data);

  if (!summaries.length) {
    return `# Previous observations
    
    No previous observations`;
  }

  return `# Previous observations
  
  ${summaries.map((summary, index) => {
    const header = `## Observation #${index + 1}`;

    const entitiesHeader = summary.investigations.length
      ? `### Investigated entities
      
      ${summary.investigations
        .map((investigation) => `- ${formatEntity(investigation.entity)}`)
        .join('\n')}`
      : undefined;

    const summaryBody = `### Summary
    
    ${toBlockquote(summary.content)}`;

    return compact([header, entitiesHeader, summaryBody]).join('\n\n');
  })}`;
}
