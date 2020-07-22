/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointEvent } from '../../../../common/endpoint/types';

/**
 * Simple mock endpoint event that works for tree layouts.
 */
export function mockEndpointEvent({
  entityID,
  name,
  parentEntityId,
  timestamp,
}: {
  entityID: string;
  name: string;
  parentEntityId?: string;
  timestamp: number;
}): EndpointEvent {
  return {
    '@timestamp': timestamp,
    event: {
      type: 'start',
      category: 'process',
    },
    process: {
      entity_id: entityID,
      name,
      parent: {
        entity_id: parentEntityId,
      },
    },
  } as EndpointEvent;
}
