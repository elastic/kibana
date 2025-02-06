/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeEntities } from './merge_entities';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import type { EntityLatestServiceRaw } from '../types';

describe('mergeEntities', () => {
  it('modifies one service', () => {
    const entities: EntityLatestServiceRaw[] = [
      {
        'data_stream.type': ['metrics', 'logs'],
        'agent.name': 'nodejs',
        'service.environment': 'test',
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1',
        'entity.display_name': 'service-1',
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: ['metrics', 'logs'],
        environments: ['test'],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-1',
      },
    ]);
  });

  it('joins two service with the same name ', () => {
    const entities: EntityLatestServiceRaw[] = [
      {
        'data_stream.type': ['foo'],
        'agent.name': 'nodejs',
        'service.environment': 'env-service-1',
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:env-service-1',
        'entity.display_name': 'service-1',
      },
      {
        'data_stream.type': ['bar'],
        'agent.name': 'nodejs',
        'service.environment': 'env-service-2',
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:env-service-2',
        'entity.display_name': 'service-1',
      },
      {
        'data_stream.type': ['baz'],
        'agent.name': 'java',
        'service.environment': 'env-service-3',
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-2',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-2:env-service-3',
        'entity.display_name': 'service-2',
      },
      {
        'data_stream.type': ['baz'],
        'agent.name': ['java'],
        'service.environment': 'env-service-4',
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-2',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-2:env-service-4',
        'entity.display_name': 'service-2',
      },
    ];

    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: ['foo', 'bar'],
        environments: ['env-service-1', 'env-service-2'],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-1',
      },
      {
        agentName: 'java' as AgentName,
        dataStreamTypes: ['baz'],
        environments: ['env-service-3', 'env-service-4'],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-2',
      },
    ]);
  });
  it('handles duplicate environments and data streams', () => {
    const entities: EntityLatestServiceRaw[] = [
      {
        'data_stream.type': ['metrics', 'logs'],
        'agent.name': ['nodejs'],
        'service.environment': 'test',
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
      {
        'data_stream.type': ['metrics', 'logs'],
        'agent.name': ['nodejs'],
        'service.environment': 'test',
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
      {
        'data_stream.type': ['foo'],
        'agent.name': ['nodejs'],
        'service.environment': 'prod',
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:prod',
        'entity.display_name': 'service-1',
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: ['metrics', 'logs', 'foo'],
        environments: ['test', 'prod'],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-1',
      },
    ]);
  });
  it('handles null environment', () => {
    const entity: EntityLatestServiceRaw[] = [
      {
        'data_stream.type': [],
        'agent.name': ['nodejs'],
        'service.environment': null,
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
    ];
    const entityResult = mergeEntities({ entities: entity });
    expect(entityResult).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: [],
        environments: [],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-1',
      },
    ]);

    const entities: EntityLatestServiceRaw[] = [
      {
        'data_stream.type': [],
        'agent.name': ['nodejs'],
        'service.environment': null,
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
      {
        'data_stream.type': [],
        'agent.name': ['nodejs'],
        'service.environment': null,
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: [],
        environments: [],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-1',
      },
    ]);
  });

  it('handles undefined environment', () => {
    const entity: EntityLatestServiceRaw[] = [
      {
        'data_stream.type': [],
        'agent.name': ['nodejs'],
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
    ];
    const entityResult = mergeEntities({ entities: entity });
    expect(entityResult).toEqual([
      {
        agentName: 'nodejs',
        dataStreamTypes: [],
        environments: [],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-1',
      },
    ]);

    const entities: EntityLatestServiceRaw[] = [
      {
        'data_stream.type': [],
        'agent.name': ['nodejs'],
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
      {
        'data_stream.type': [],
        'agent.name': ['nodejs'],
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs',
        dataStreamTypes: [],
        environments: [],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-1',
      },
    ]);
  });

  it('has no logs when log rate is not returned', () => {
    const entities: EntityLatestServiceRaw[] = [
      {
        'data_stream.type': ['metrics'],
        'agent.name': ['nodejs'],
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'service.environment': 'test',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: ['metrics'],
        environments: ['test'],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-1',
      },
    ]);
  });
  it('has multiple duplicate environments and data stream types', () => {
    const entities: EntityLatestServiceRaw[] = [
      {
        'data_stream.type': ['metrics', 'metrics', 'logs', 'logs'],
        'agent.name': ['nodejs', 'nodejs'],
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'service.environment': ['test', 'test', 'test'],
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: ['metrics', 'logs'],
        environments: ['test'],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-1',
      },
    ]);
  });
  it('has a single data stream type and no environment', () => {
    const entities: EntityLatestServiceRaw[] = [
      {
        'data_stream.type': 'logs',
        'agent.name': ['nodejs', 'nodejs'],
        'entity.last_seen_timestamp': '2024-12-13T14:52:35.461Z',
        'service.name': 'service-1',
        'entity.type': 'built_in_services_from_ecs_data',
        'entity.id': 'service-1:test',
        'entity.display_name': 'service-1',
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: ['logs'],
        environments: [],
        lastSeenTimestamp: '2024-12-13T14:52:35.461Z',
        serviceName: 'service-1',
      },
    ]);
  });
});
