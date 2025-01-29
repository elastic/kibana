/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole, ToolCallsOf } from '@kbn/inference-common';
import { entityQuery } from '@kbn/observability-utils-common/es/queries/entity_query';
import { RCA_INVESTIGATE_ENTITY_TOOL_NAME } from '@kbn/observability-ai-common/root_cause_analysis';
import { isEqual } from 'lodash';
import { getEntitiesByFuzzySearch } from '@kbn/observability-utils-server/entities/get_entities_by_fuzzy_search';
import { RCA_TOOLS } from '../tools';
import {
  InvestigateEntityToolMessage,
  RootCauseAnalysisContext,
  RootCauseAnalysisToolRequest,
} from '../types';
import { formatEntity } from './format_entity';

interface EntityExistsResultExists {
  exists: true;
  entity: Record<string, string>;
}

interface EntityExistsResultDoesNotExist {
  exists: false;
  entity: Record<string, string>;
  suggestions: string[];
}

type EntityExistsResult = EntityExistsResultExists | EntityExistsResultDoesNotExist;

export async function validateInvestigateEntityToolCalls({
  rcaContext,
  toolCalls,
}: {
  rcaContext: Pick<RootCauseAnalysisContext, 'esClient' | 'indices' | 'start' | 'end' | 'events'>;
  toolCalls: RootCauseAnalysisToolRequest[];
}) {
  const { events, esClient, indices, start, end } = rcaContext;

  const previouslyInvestigatedEntities = events
    .filter(
      (event): event is InvestigateEntityToolMessage =>
        event.role === MessageRole.Tool && event.name === RCA_INVESTIGATE_ENTITY_TOOL_NAME
    )
    .map((toolResponse) => toolResponse.response.entity);

  const investigateEntityToolCalls = toolCalls.filter(
    (
      toolCall
    ): toolCall is ToolCallsOf<{
      tools: Pick<typeof RCA_TOOLS, typeof RCA_INVESTIGATE_ENTITY_TOOL_NAME>;
    }>['toolCalls'][number] => toolCall.function.name === RCA_INVESTIGATE_ENTITY_TOOL_NAME
  );

  if (!investigateEntityToolCalls.length) {
    return [];
  }

  const entitiesToInvestigate = investigateEntityToolCalls.map((toolCall) => {
    const { entity: entityToInvestigate } = toolCall.function.arguments;
    return {
      [entityToInvestigate.field]: entityToInvestigate.value,
    };
  });
  const entityExistsResponses: EntityExistsResult[] = await Promise.all(
    entitiesToInvestigate.map(async (entity) => {
      const response = await esClient.search('find_data_for_entity', {
        track_total_hits: 1,
        size: 0,
        timeout: '1ms',
        index: indices.logs.concat(indices.traces),
        query: {
          bool: {
            filter: [...entityQuery(entity)],
          },
        },
      });

      const exists = response.hits.total.value > 0;
      if (!exists) {
        return getEntitiesByFuzzySearch({
          start,
          end,
          esClient,
          index: indices.logs.concat(indices.traces),
          entity,
        }).then((suggestions) => {
          return {
            entity,
            exists,
            suggestions,
          };
        });
      }

      return { entity, exists };
    })
  );

  const alreadyInvestigatedEntities = entitiesToInvestigate.filter((entity) => {
    return previouslyInvestigatedEntities.some((prevEntity) => isEqual(entity, prevEntity));
  });

  const errors = [
    ...entityExistsResponses
      .filter(
        (entityExistsResult): entityExistsResult is EntityExistsResultDoesNotExist =>
          !entityExistsResult.exists
      )
      .map(({ suggestions, entity }) => {
        return `Entity ${formatEntity(
          entity
        )} does not exist. Did you mean one of ${suggestions.join(', ')}?`;
      }),
    ...alreadyInvestigatedEntities.map((entity) => {
      return `Entity ${formatEntity(entity)} was already investigated before.`;
    }),
  ];

  return errors;
}
