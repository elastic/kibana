/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stableStringify } from '@kbn/std';
import pLimit from 'p-limit';
import type { RelatedEntityFromSearchResults } from '.';
import {
  RCA_PROMPT_DEPENDENCIES,
  RCA_PROMPT_ENTITIES,
  RCA_SYSTEM_PROMPT_BASE,
} from '../../prompts';
import type { RootCauseAnalysisContext } from '../../types';
import { formatEntity } from '../../util/format_entity';
import { getPreviouslyInvestigatedEntities } from '../../util/get_previously_investigated_entities';
import { toBlockquote } from '../../util/to_blockquote';

export interface RelatedEntityDescription {
  entity: Record<string, string>;
  reason: string;
  confidence: string;
}

export async function extractRelatedEntities({
  entity,
  entityReport,
  summaries,
  foundEntities,
  context,
  rcaContext: { events, connectorId, inferenceClient },
}: {
  foundEntities: RelatedEntityFromSearchResults[];
  entity: Record<string, string>;
  entityReport: string;
  summaries: string[];
  context: string;
  rcaContext: Pick<RootCauseAnalysisContext, 'events' | 'connectorId' | 'inferenceClient'>;
}): Promise<{ relatedEntities: RelatedEntityDescription[] }> {
  const system = `${RCA_SYSTEM_PROMPT_BASE}
  
  ${RCA_PROMPT_ENTITIES}

  ${RCA_PROMPT_DEPENDENCIES}`;

  const previouslyInvestigatedEntities = getPreviouslyInvestigatedEntities({ events });

  const previouslyInvestigatedEntitiesPrompt = previouslyInvestigatedEntities.length
    ? `## Previously investigated entities

    ${previouslyInvestigatedEntities
      .map((prevEntity) => `- ${formatEntity(prevEntity)}`)
      .join('\n')}`
    : '';

  const prompts = summaries.map((summary) => {
    return `
    # Investigated entity

    ${formatEntity(entity)}

    # Report

    ${toBlockquote(entityReport)}

    # Related entities report

    ${toBlockquote(summary)}
    
    ${previouslyInvestigatedEntitiesPrompt}

    # Context

    ${context}

    # Task

    Your current task is to extract relevant entities as a data structure from the
    related entities report. Order them by relevance to the investigation, put the
    most relevant ones first.
  `;
  });

  const limiter = pLimit(5);

  const allEvents = await Promise.all(
    prompts.map(async (input) => {
      const completeEvent = await limiter(() =>
        inferenceClient.output({
          id: 'get_entity_relationships',
          connectorId,
          system,
          input,
          schema: {
            type: 'object',
            properties: {
              related_entities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    entity: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string',
                        },
                        value: {
                          type: 'string',
                        },
                      },
                      required: ['field', 'value'],
                    },
                    reason: {
                      type: 'string',
                      description: 'Describe why this entity might be relevant. Provide evidence.',
                    },
                    confidence: {
                      type: 'string',
                      description:
                        'Describe how confident you are in your conclusion about this relationship: low, moderate, high',
                    },
                  },

                  required: ['entity', 'reason', 'confidence'],
                },
              },
            },
            required: ['related_entities'],
          } as const,
        })
      );
      return completeEvent.output;
    })
  );

  const foundEntityIds = foundEntities.map(({ entity: foundEntity }) =>
    stableStringify(foundEntity)
  );

  const relatedEntities = allEvents
    .flat()
    .flatMap((event) => {
      return event.related_entities.map((item) => {
        return {
          entity: { [item.entity.field]: item.entity.value },
          reason: item.reason,
          confidence: item.confidence,
        };
      });
    })
    .filter((item) => {
      return foundEntityIds.includes(stableStringify(item.entity));
    });

  return {
    relatedEntities,
  };
}
