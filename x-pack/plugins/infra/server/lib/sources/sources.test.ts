/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraSources } from './sources';

describe('the InfraSources lib', () => {
  describe('getSourceConfiguration method', () => {
    test('returns a source configuration if it exists', async () => {
      const sourcesLib = new InfraSources({
        config: createMockStaticConfiguration({}),
      });

      const request: any = createRequestContext({
        id: 'TEST_ID',
        version: 'foo',
        updated_at: '2000-01-01T00:00:00.000Z',
        attributes: {
          metricAlias: 'METRIC_ALIAS',
          logIndices: { type: 'index_pattern', indexPatternId: 'LOG_ALIAS' },
          fields: {
            container: 'CONTAINER',
            host: 'HOST',
            pod: 'POD',
            tiebreaker: 'TIEBREAKER',
            timestamp: 'TIMESTAMP',
          },
        },
      });

      expect(
        await sourcesLib.getSourceConfiguration(request.core.savedObjects.client, 'TEST_ID')
      ).toMatchObject({
        id: 'TEST_ID',
        version: 'foo',
        updatedAt: 946684800000,
        configuration: {
          metricAlias: 'METRIC_ALIAS',
          logIndices: { type: 'index_pattern', indexPatternId: 'LOG_ALIAS' },
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
        config: createMockStaticConfiguration({
          default: {
            metricAlias: 'METRIC_ALIAS',
            logIndices: { type: 'index_pattern', indexPatternId: 'LOG_ALIAS' },
            fields: {
              host: 'HOST',
              pod: 'POD',
              tiebreaker: 'TIEBREAKER',
              timestamp: 'TIMESTAMP',
            },
          },
        }),
      });

      const request: any = createRequestContext({
        id: 'TEST_ID',
        version: 'foo',
        updated_at: '2000-01-01T00:00:00.000Z',
        attributes: {
          fields: {
            container: 'CONTAINER',
          },
        },
      });

      expect(
        await sourcesLib.getSourceConfiguration(request.core.savedObjects.client, 'TEST_ID')
      ).toMatchObject({
        id: 'TEST_ID',
        version: 'foo',
        updatedAt: 946684800000,
        configuration: {
          metricAlias: 'METRIC_ALIAS',
          logIndices: { type: 'index_pattern', indexPatternId: 'LOG_ALIAS' },
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
        config: createMockStaticConfiguration({}),
      });

      const request: any = createRequestContext({
        id: 'TEST_ID',
        version: 'foo',
        updated_at: '2000-01-01T00:00:00.000Z',
        attributes: {},
      });

      expect(
        await sourcesLib.getSourceConfiguration(request.core.savedObjects.client, 'TEST_ID')
      ).toMatchObject({
        id: 'TEST_ID',
        version: 'foo',
        updatedAt: 946684800000,
        configuration: {
          metricAlias: expect.any(String),
          logIndices: expect.any(Object),
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

const createMockStaticConfiguration = (sources: any) => ({
  enabled: true,
  inventory: {
    compositeSize: 2000,
  },
  sources,
});

const createRequestContext = (savedObject?: any) => {
  return {
    core: {
      savedObjects: {
        client: {
          async get() {
            return savedObject;
          },
          errors: {
            isNotFoundError() {
              return typeof savedObject === 'undefined';
            },
          },
        },
      },
    },
  };
};
