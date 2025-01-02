/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, Observable, of, switchMap } from 'rxjs';
import { MessageRole } from '@kbn/inference-common';
import { RCA_INVESTIGATE_ENTITY_TOOL_NAME } from '@kbn/observability-ai-common/root_cause_analysis';
import { InvestigateEntityToolMessage, RootCauseAnalysisContext, ToolErrorMessage } from './types';
import { investigateEntity } from './tasks/investigate_entity';
import { formatEntity } from './util/format_entity';

export function callInvestigateEntityTool({
  field,
  value,
  context,
  toolCallId,
  rcaContext,
}: {
  field: string;
  value: string;
  context: string;
  toolCallId: string;
  rcaContext: RootCauseAnalysisContext;
}): Observable<InvestigateEntityToolMessage | ToolErrorMessage> {
  const nextEntity = {
    [field]: value,
  };

  return from(
    investigateEntity({
      rcaContext,
      entity: nextEntity,
      context,
    })
  ).pipe(
    switchMap((entityInvestigation) => {
      if (!entityInvestigation) {
        const entityNotFoundToolMessage: ToolErrorMessage = {
          name: 'error',
          role: MessageRole.Tool,
          response: {
            error: {
              message: `Entity ${formatEntity(nextEntity)} not found, have
            you verified it exists and if the field and value you are using
            are correct?`,
            },
          },
          toolCallId,
        };

        return of(entityNotFoundToolMessage);
      }

      const {
        attachments,
        relatedEntities,
        entity: investigatedEntity,
        summary,
      } = entityInvestigation;
      const toolMessage: InvestigateEntityToolMessage = {
        name: RCA_INVESTIGATE_ENTITY_TOOL_NAME,
        role: MessageRole.Tool as const,
        toolCallId,
        response: {
          entity: investigatedEntity,
          relatedEntities,
          summary,
        },
        data: {
          attachments,
        },
      };

      return of(toolMessage);
    })
  );
}
