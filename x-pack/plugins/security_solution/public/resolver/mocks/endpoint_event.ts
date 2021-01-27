/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SafeResolverEvent } from '../../../common/endpoint/types';

/**
 * Simple mock endpoint event that works for tree layouts.
 */
export function mockEndpointEvent({
  entityID,
  processName = 'process name',
  parentEntityID,
  timestamp = 0,
  eventType = 'start',
  eventCategory = 'process',
  pid = 0,
  eventID = 'event id',
}: {
  entityID: string;
  processName?: string;
  parentEntityID?: string;
  timestamp?: number;
  eventType?: string;
  eventCategory?: string;
  pid?: number;
  eventID?: string | number;
}): SafeResolverEvent {
  return {
    '@timestamp': timestamp,
    event: {
      type: eventType,
      category: eventCategory,
      id: String(eventID),
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
      name: processName,
      pid,
      hash: {
        md5: 'hash.md5',
      },
      parent: {
        pid: 0,
        entity_id: parentEntityID,
      },
    },
  };
}
