/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

type Seconds = number;

export const FIELD_RETENTION_ENRICH_POLICY_EXECUTION_EVENT: EventTypeOpts<{
  duration: Seconds;
  interval: string;
}> = {
  eventType: 'field_retention_enrich_policy_execution',
  schema: {
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the field retention enrich policy execution time',
      },
    },
    interval: {
      type: 'keyword',
      _meta: {
        description: 'Configured interval for the field retention enrich policy task',
      },
    },
  },
};

export const ENTITY_ENGINE_RESOURCE_INIT_FAILURE_EVENT: EventTypeOpts<{
  error: string;
}> = {
  eventType: 'entity_engine_resource_init_failure',
  schema: {
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message for a resource initialization failure',
      },
    },
  },
};

export const ENTITY_ENGINE_INITIALIZATION_EVENT: EventTypeOpts<{
  duration: Seconds;
}> = {
  eventType: 'entity_engine_initialization',
  schema: {
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the entity engine initialization',
      },
    },
  },
};

export const ENTITY_STORE_USAGE_EVENT: EventTypeOpts<{
  storeSize: number;
}> = {
  eventType: 'entity_store_usage',
  schema: {
    storeSize: {
      type: 'long',
      _meta: {
        description: 'Number of entities stored in the entity store',
      },
    },
  },
};
