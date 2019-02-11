/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraInmemoryConfigurationAdapter } from '../adapters/configuration/inmemory_configuration_adapter';
import { InfraSources } from './sources';

describe('the InfraSources lib', () => {
  describe('getSourceConfiguration method', () => {
    test('returns a source configuration if it exists', async () => {
      const sourcesLib = new InfraSources({
        configuration: createMockStaticConfiguration({}),
        savedObjects: createMockSavedObjectsService({
          id: 'TEST_ID',
          version: 1,
          updated_at: '2000-01-01T00:00:00.000Z',
          attributes: {
            metricAlias: 'METRIC_ALIAS',
            logAlias: 'LOG_ALIAS',
            fields: {
              container: 'CONTAINER',
              host: 'HOST',
              pod: 'POD',
              tiebreaker: 'TIEBREAKER',
              timestamp: 'TIMESTAMP',
            },
          },
        }),
      });

      const request: any = Symbol();

      expect(await sourcesLib.getSourceConfiguration(request, 'TEST_ID')).toMatchObject({
        id: 'TEST_ID',
        version: 1,
        updatedAt: 946684800000,
        configuration: {
          metricAlias: 'METRIC_ALIAS',
          logAlias: 'LOG_ALIAS',
          fields: {
            container: 'CONTAINER',
            host: 'HOST',
            pod: 'POD',
            tiebreaker: 'TIEBREAKER',
            timestamp: 'TIMESTAMP',
          },
        },
      });
    });

    test('adds missing attributes from the static configuration to a source configuration', async () => {
      const sourcesLib = new InfraSources({
        configuration: createMockStaticConfiguration({
          default: {
            metricAlias: 'METRIC_ALIAS',
            logAlias: 'LOG_ALIAS',
            fields: {
              host: 'HOST',
              pod: 'POD',
              tiebreaker: 'TIEBREAKER',
              timestamp: 'TIMESTAMP',
            },
          },
        }),
        savedObjects: createMockSavedObjectsService({
          id: 'TEST_ID',
          version: 1,
          updated_at: '2000-01-01T00:00:00.000Z',
          attributes: {
            fields: {
              container: 'CONTAINER',
            },
          },
        }),
      });

      const request: any = Symbol();

      expect(await sourcesLib.getSourceConfiguration(request, 'TEST_ID')).toMatchObject({
        id: 'TEST_ID',
        version: 1,
        updatedAt: 946684800000,
        configuration: {
          metricAlias: 'METRIC_ALIAS',
          logAlias: 'LOG_ALIAS',
          fields: {
            container: 'CONTAINER',
            host: 'HOST',
            pod: 'POD',
            tiebreaker: 'TIEBREAKER',
            timestamp: 'TIMESTAMP',
          },
        },
      });
    });

    test('adds missing attributes from the default configuration to a source configuration', async () => {
      const sourcesLib = new InfraSources({
        configuration: createMockStaticConfiguration({}),
        savedObjects: createMockSavedObjectsService({
          id: 'TEST_ID',
          version: 1,
          updated_at: '2000-01-01T00:00:00.000Z',
          attributes: {},
        }),
      });

      const request: any = Symbol();

      expect(await sourcesLib.getSourceConfiguration(request, 'TEST_ID')).toMatchObject({
        id: 'TEST_ID',
        version: 1,
        updatedAt: 946684800000,
        configuration: {
          metricAlias: expect.any(String),
          logAlias: expect.any(String),
          fields: {
            container: expect.any(String),
            host: expect.any(String),
            pod: expect.any(String),
            tiebreaker: expect.any(String),
            timestamp: expect.any(String),
          },
        },
      });
    });
  });
});

const createMockStaticConfiguration = (sources: any) =>
  new InfraInmemoryConfigurationAdapter({
    enabled: true,
    query: {
      partitionSize: 1,
      partitionFactor: 1,
    },
    sources,
  });

const createMockSavedObjectsService = (savedObject?: any) => ({
  getScopedSavedObjectsClient() {
    return {
      async get() {
        return savedObject;
      },
    } as any;
  },
  SavedObjectsClient: {
    errors: {
      isNotFoundError() {
        return typeof savedObject === 'undefined';
      },
    },
  },
});
