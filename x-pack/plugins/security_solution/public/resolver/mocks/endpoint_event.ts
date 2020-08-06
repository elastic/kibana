/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointEvent } from '../../../common/endpoint/types';

/**
 * Simple mock endpoint event that works for tree layouts.
 */
export function mockEndpointEvent({
  entityID,
  name,
  parentEntityId,
  timestamp,
  lifecycleType,
  pid = 0,
}: {
  entityID: string;
  name: string;
  parentEntityId?: string;
  timestamp: number;
  lifecycleType?: string;
  pid?: number;
}): EndpointEvent {
  return {
    '@timestamp': timestamp,
    event: {
      type: lifecycleType ? lifecycleType : 'start',
      category: 'process',
    },
    agent: {
      id: 'agent.id',
      version: 'agent.version',
      type: 'agent.type',
    },
    ecs: {
      version: 'ecs.version',
    },
    user: {
      name: 'user.name',
      domain: 'user.domain',
    },
    process: {
      entity_id: entityID,
      executable: 'executable',
      args: 'args',
      name,
      pid,
      hash: {
        md5: 'hash.md5',
      },
      parent: {
        pid: 0,
        entity_id: parentEntityId,
      },
    },
  } as EndpointEvent;
}
