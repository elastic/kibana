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
  lifecycleType,
}: {
  entityID: string;
  name: string;
  parentEntityId?: string;
  timestamp: number;
  lifecycleType?: string;
}): EndpointEvent {
  return {
    '@timestamp': timestamp,
    event: {
      type: lifecycleType ? lifecycleType : 'start',
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
