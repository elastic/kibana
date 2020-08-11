/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointEvent } from '../../../../common/endpoint/types';

/**
 * Simple mock related event.
 */
export function mockRelatedEvent({
  entityID,
  timestamp,
  category,
  type,
  id,
}: {
  entityID: string;
  timestamp: number;
  category: string;
  type: string;
  id?: string;
}): EndpointEvent {
  return {
    '@timestamp': timestamp,
    event: {
      kind: 'event',
      type,
      category,
      id: id ?? 'xyz',
    },
    process: {
      entity_id: entityID,
    },
  } as EndpointEvent;
}
