/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const actionsMapping: MappingTypeMapping = {
  properties: {
    '@timestamp': {
      type: 'date',
    },
    action_id: {
      type: 'keyword',
      ignore_above: 1024,
    },
    agent_ids: {
      type: 'keyword',
      ignore_above: 1024,
    },
    agents: {
      type: 'keyword',
      ignore_above: 1024,
    },
    data: {
      properties: {
        query: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    event: {
      properties: {
        agent_id_status: {
          type: 'keyword',
          ignore_above: 1024,
        },
        ingested: {
          type: 'date',
          format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
        },
      },
    },
    expiration: {
      type: 'date',
    },
    input_type: {
      type: 'keyword',
      ignore_above: 1024,
    },
    type: {
      type: 'keyword',
      ignore_above: 1024,
    },
    user_id: {
      type: 'keyword',
      ignore_above: 1024,
    },
    metadata: {
      type: 'object',
      enabled: false,
    },
    pack_id: {
      type: 'keyword',
      ignore_above: 1024,
    },
    pack_name: {
      type: 'keyword',
      ignore_above: 1024,
    },
    pack_prebuilt: {
      type: 'boolean',
    },
    queries: {
      properties: {
        action_id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        agents: {
          type: 'keyword',
          ignore_above: 1024,
        },
        ecs_mapping: {
          type: 'object',
          enabled: false,
        },
        id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        platform: {
          type: 'keyword',
          ignore_above: 1024,
        },
        query: {
          type: 'text',
        },
        saved_query_id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        saved_query_prebuilt: {
          type: 'boolean',
        },
        version: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
  },
};
