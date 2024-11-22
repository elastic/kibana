/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeEntities } from './merge_entities';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { EntityLatestServiceRaw } from '../types';

describe('mergeEntities', () => {
  it('modifies one service', () => {
    const entities: EntityLatestServiceRaw[] = [
      {
        service: {
          name: 'service-1',
          environment: 'test',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: ['metrics', 'logs'] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name', 'service.environment'],
          id: 'service-1:test',
        },
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: ['metrics', 'logs'],
        environments: ['test'],
        lastSeenTimestamp: '2024-06-05T10:34:40.810Z',
        serviceName: 'service-1',
      },
    ]);
  });

  it('joins two service with the same name ', () => {
    const entities: EntityLatestServiceRaw[] = [
      {
        service: {
          name: 'service-1',
          environment: 'env-service-1',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: ['foo'] },
        entity: {
          last_seen_timestamp: '2024-03-05T10:34:40.810Z',
          identity_fields: ['service.name', 'service.environment'],
          id: 'service-1:env-service-1',
        },
      },
      {
        service: {
          name: 'service-1',
          environment: 'env-service-2',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: ['bar'] },
        entity: {
          last_seen_timestamp: '2024-03-05T10:34:40.810Z',
          identity_fields: ['service.name', 'service.environment'],
          id: 'apm-only-1:synthtrace-env-2',
        },
      },
      {
        service: {
          name: 'service-2',
          environment: 'env-service-3',
        },
        agent: { name: ['java'] },
        source_data_stream: { type: ['baz'] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name', 'service.environment'],
          id: 'service-2:env-service-3',
        },
      },
      {
        service: {
          name: 'service-2',
          environment: 'env-service-4',
        },
        agent: { name: ['java'] },
        source_data_stream: { type: ['baz'] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name', 'service.environment'],
          id: 'service-2:env-service-3',
        },
      },
    ];

    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: ['foo', 'bar'],
        environments: ['env-service-1', 'env-service-2'],
        lastSeenTimestamp: '2024-03-05T10:34:40.810Z',
        serviceName: 'service-1',
      },
      {
        agentName: 'java' as AgentName,
        dataStreamTypes: ['baz'],
        environments: ['env-service-3', 'env-service-4'],
        lastSeenTimestamp: '2024-06-05T10:34:40.810Z',
        serviceName: 'service-2',
      },
    ]);
  });
  it('handles duplicate environments and data streams', () => {
    const entities: EntityLatestServiceRaw[] = [
      {
        service: {
          name: 'service-1',
          environment: 'test',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: ['metrics', 'logs'] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name', 'service.environment'],
          id: 'service-1:test',
        },
      },
      {
        service: {
          name: 'service-1',
          environment: 'test',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: ['metrics', 'logs'] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name', 'service.environment'],
          id: 'service-1:test',
        },
      },
      {
        service: {
          name: 'service-1',
          environment: 'prod',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: ['foo'] },
        entity: {
          last_seen_timestamp: '2024-23-05T10:34:40.810Z',
          identity_fields: ['service.name', 'service.environment'],
          id: 'service-1:prod',
        },
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: ['metrics', 'logs', 'foo'],
        environments: ['test', 'prod'],
        lastSeenTimestamp: '2024-23-05T10:34:40.810Z',
        serviceName: 'service-1',
      },
    ]);
  });
  it('handles null environment', () => {
    const entity: EntityLatestServiceRaw[] = [
      {
        service: {
          name: 'service-1',
          environment: undefined,
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: [] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name'],
          id: 'service-1:test',
        },
      },
    ];
    const entityResult = mergeEntities({ entities: entity });
    expect(entityResult).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: [],
        environments: [],
        lastSeenTimestamp: '2024-06-05T10:34:40.810Z',
        serviceName: 'service-1',
      },
    ]);

    const entities: EntityLatestServiceRaw[] = [
      {
        service: {
          name: 'service-1',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: [] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name'],
          id: 'service-1:test',
        },
      },
      {
        service: {
          name: 'service-1',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: [] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name'],
          id: 'service-1:test',
        },
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: [],
        environments: [],
        lastSeenTimestamp: '2024-06-05T10:34:40.810Z',
        serviceName: 'service-1',
      },
    ]);
  });

  it('handles undefined environment', () => {
    const entity: EntityLatestServiceRaw[] = [
      {
        service: {
          name: 'service-1',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: [] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name'],
          id: 'service-1:test',
        },
      },
    ];
    const entityResult = mergeEntities({ entities: entity });
    expect(entityResult).toEqual([
      {
        agentName: 'nodejs',
        dataStreamTypes: [],
        environments: [],
        lastSeenTimestamp: '2024-06-05T10:34:40.810Z',
        serviceName: 'service-1',
      },
    ]);

    const entities: EntityLatestServiceRaw[] = [
      {
        service: {
          name: 'service-1',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: [] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name'],
          id: 'service-1:test',
        },
      },
      {
        service: {
          name: 'service-1',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: [] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name'],
          id: 'service-1:test',
        },
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs',
        dataStreamTypes: [],
        environments: [],
        lastSeenTimestamp: '2024-06-05T10:34:40.810Z',
        serviceName: 'service-1',
      },
    ]);
  });

  it('has no logs when log rate is not returned', () => {
    const entities: EntityLatestServiceRaw[] = [
      {
        service: {
          name: 'service-1',
          environment: 'test',
        },
        agent: { name: ['nodejs'] },
        source_data_stream: { type: ['metrics'] },
        entity: {
          last_seen_timestamp: '2024-06-05T10:34:40.810Z',
          identity_fields: ['service.name', 'service.environment'],
          id: 'service-1:test',
        },
      },
    ];
    const result = mergeEntities({ entities });
    expect(result).toEqual([
      {
        agentName: 'nodejs' as AgentName,
        dataStreamTypes: ['metrics'],
        environments: ['test'],
        lastSeenTimestamp: '2024-06-05T10:34:40.810Z',
        serviceName: 'service-1',
      },
    ]);
  });
});
