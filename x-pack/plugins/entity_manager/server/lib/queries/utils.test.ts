/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeEntitiesList } from './utils';

describe('mergeEntitiesList', () => {
  describe('mergeEntitiesList', () => {
    it('merges entities on entity.id', () => {
      const entities = [
        {
          'entity.id': 'foo',
          'entity.last_seen_timestamp': '2024-11-20T18:00:00.000Z',
          'entity.type': 'service',
        },
        {
          'entity.id': 'foo',
          'entity.last_seen_timestamp': '2024-11-20T18:00:00.000Z',
          'entity.type': 'service',
        },
      ];

      const mergedEntities = mergeEntitiesList(entities);
      expect(mergedEntities.length).toEqual(1);
      expect(mergedEntities[0]).toEqual({
        'entity.id': 'foo',
        'entity.last_seen_timestamp': '2024-11-20T18:00:00.000Z',
        'entity.type': 'service',
      });
    });

    it('merges metadata fields', () => {
      const entities = [
        {
          'entity.id': 'foo',
          'entity.last_seen_timestamp': '2024-11-20T18:00:00.000Z',
          'entity.type': 'service',
          'metadata.host.name': 'host-1',
          'metadata.agent.name': 'agent-1',
          'metadata.service.environment': ['dev', 'staging'],
          'metadata.only_in_record_1': 'foo',
        },
        {
          'entity.id': 'foo',
          'entity.last_seen_timestamp': '2024-11-20T18:00:00.000Z',
          'entity.type': 'service',
          'metadata.host.name': ['host-2', 'host-3'],
          'metadata.agent.name': 'agent-2',
          'metadata.service.environment': 'prod',
          'metadata.only_in_record_2': 'bar',
        },
      ];

      const mergedEntities = mergeEntitiesList(entities);
      expect(mergedEntities.length).toEqual(1);
      expect(mergedEntities[0]).toEqual({
        'entity.id': 'foo',
        'entity.last_seen_timestamp': '2024-11-20T18:00:00.000Z',
        'entity.type': 'service',
        'metadata.host.name': ['host-1', 'host-2', 'host-3'],
        'metadata.agent.name': ['agent-1', 'agent-2'],
        'metadata.service.environment': ['dev', 'staging', 'prod'],
        'metadata.only_in_record_1': 'foo',
        'metadata.only_in_record_2': 'bar',
      });
    });

    it('picks most recent timestamp when merging', () => {
      const entities = [
        {
          'entity.id': 'foo',
          'entity.last_seen_timestamp': '2024-11-20T18:00:00.000Z',
          'entity.type': 'service',
          'metadata.host.name': 'host-1',
        },
        {
          'entity.id': 'foo',
          'entity.last_seen_timestamp': '2024-11-20T20:00:00.000Z',
          'entity.type': 'service',
          'metadata.host.name': 'host-2',
        },
        {
          'entity.id': 'foo',
          'entity.last_seen_timestamp': '2024-11-20T16:00:00.000Z',
          'entity.type': 'service',
          'metadata.host.name': 'host-3',
        },
      ];

      const mergedEntities = mergeEntitiesList(entities);
      expect(mergedEntities.length).toEqual(1);
      expect(mergedEntities[0]).toEqual({
        'entity.id': 'foo',
        'entity.last_seen_timestamp': '2024-11-20T20:00:00.000Z',
        'entity.type': 'service',
        'metadata.host.name': ['host-1', 'host-2', 'host-3'],
      });
    });

    it('deduplicates metadata values', () => {
      const entities = [
        {
          'entity.id': 'foo',
          'entity.last_seen_timestamp': '2024-11-20T18:00:00.000Z',
          'entity.type': 'service',
          'metadata.host.name': 'host-1',
        },
        {
          'entity.id': 'foo',
          'entity.last_seen_timestamp': '2024-11-20T20:00:00.000Z',
          'entity.type': 'service',
          'metadata.host.name': 'host-2',
        },
        {
          'entity.id': 'foo',
          'entity.last_seen_timestamp': '2024-11-20T16:00:00.000Z',
          'entity.type': 'service',
          'metadata.host.name': ['host-1', 'host-2'],
        },
      ];

      const mergedEntities = mergeEntitiesList(entities);
      expect(mergedEntities.length).toEqual(1);
      expect(mergedEntities[0]).toEqual({
        'entity.id': 'foo',
        'entity.last_seen_timestamp': '2024-11-20T20:00:00.000Z',
        'entity.type': 'service',
        'metadata.host.name': ['host-1', 'host-2'],
      });
    });
  });
});
