/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RCA_END_PROCESS_TOOL_NAME,
  RCA_INVESTIGATE_ENTITY_TOOL_NAME,
  RCA_OBSERVE_TOOL_NAME,
} from '@kbn/observability-ai-common/root_cause_analysis/tool_names';

export const RCA_TOOLS = {
  [RCA_OBSERVE_TOOL_NAME]: {
    description: `Request an observation from another agent on
    the results of the returned investigations. The title should
    cover key new observations from the initial context or
    completed investigations, not anything about next steps.`,
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: `A short title w/ the key new observations that will be displayed on top of a collapsible panel.`,
        },
      },
      required: ['title'],
    },
  },
  [RCA_END_PROCESS_TOOL_NAME]: {
    description: `End the RCA process by requesting a
    written report from another agent`,
    schema: {
      type: 'object',
      properties: {
        endProcess: {
          type: 'boolean',
        },
      },
      required: ['endProcess'],
    },
  },
  [RCA_INVESTIGATE_ENTITY_TOOL_NAME]: {
    description: `Investigate an entity`,
    schema: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          description: `Context that will be used in the investigation of the entity. Mention the initial context
            of the investigation, a very short summary of the last observation if applicable, and pieces
            of data that can be relevant for the investigation into the entity, such as timestamps or
            keywords`,
        },
        entity: {
          type: 'object',
          description: `The entity you want to investigate, such as a service. Use
          the Elasticsearch field names and values. For example, for services, use
          the following structure: ${JSON.stringify({
            entity: { field: 'service.name', value: 'opbeans-java' },
          })}`,
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
      },
      required: ['context', 'entity'],
    },
  },
} as const;
