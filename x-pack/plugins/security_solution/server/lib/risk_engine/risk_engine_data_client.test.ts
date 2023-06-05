/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createOrUpdateComponentTemplate,
  createOrUpdateIlmPolicy,
  createOrUpdateIndexTemplate,
} from '@kbn/alerting-plugin/server';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { RiskEngineDataClient } from './risk_engine_data_client';
import { createConcreteWriteIndex } from './utils/create_ds';

jest.mock('@kbn/alerting-plugin/server', () => ({
  createOrUpdateComponentTemplate: jest.fn(),
  createOrUpdateIlmPolicy: jest.fn(),
  createOrUpdateIndexTemplate: jest.fn(),
}));

jest.mock('./utils/create_ds', () => ({
  createConcreteWriteIndex: jest.fn(),
}));

describe('RiskEngineDataClient', () => {
  let riskEngineDataClient: RiskEngineDataClient;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  const totalFieldsLimit = 1000;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    const options = {
      logger,
      kibanaVersion: '8.9.0',
      elasticsearchClientPromise: Promise.resolve(esClient),
    };
    riskEngineDataClient = new RiskEngineDataClient(options);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWriter', () => {
    it('should return a writer object', async () => {
      const writer = await riskEngineDataClient.getWriter({ namespace: 'default' });
      expect(writer).toBeDefined();
      expect(typeof writer?.bulk).toBe('function');
    });

    it('should cache and return the same writer for the same namespace', async () => {
      const writer1 = await riskEngineDataClient.getWriter({ namespace: 'default' });
      const writer2 = await riskEngineDataClient.getWriter({ namespace: 'default' });
      const writer3 = await riskEngineDataClient.getWriter({ namespace: 'space-1' });

      expect(writer1).toEqual(writer2);
      expect(writer2).not.toEqual(writer3);
    });

    it('should cache writer and not call initializeResources for a second tme', async () => {
      const initializeResourcesSpy = jest.spyOn(riskEngineDataClient, 'initializeResources');
      await riskEngineDataClient.getWriter({ namespace: 'default' });
      await riskEngineDataClient.getWriter({ namespace: 'default' });
      expect(initializeResourcesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeResources succes', () => {
    it('should initialize risk engine resources', async () => {
      await riskEngineDataClient.initializeResources({ namespace: 'default' });

      expect(createOrUpdateIlmPolicy).toHaveBeenCalledWith({
        logger,
        esClient,
        name: '.risk-score-ilm-policy',
        policy: {
          _meta: {
            managed: true,
          },
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                  max_primary_shard_size: '50gb',
                },
              },
            },
          },
        },
      });

      expect(createOrUpdateComponentTemplate).toHaveBeenCalledWith({
        logger,
        esClient,
        template: {
          name: '.risk-score-mappings',
          _meta: {
            managed: true,
          },
          template: {
            settings: {},
            mappings: {
              dynamic: 'strict',
              properties: {
                '@timestamp': {
                  type: 'date',
                },
                alertsScore: {
                  type: 'float',
                },
                identifierField: {
                  type: 'keyword',
                },
                identifierValue: {
                  type: 'keyword',
                },
                level: {
                  type: 'keyword',
                },
                otherScore: {
                  type: 'float',
                },
                riskiestInputs: {
                  properties: {
                    id: {
                      type: 'keyword',
                    },
                    index: {
                      type: 'keyword',
                    },
                    riskScore: {
                      type: 'float',
                    },
                  },
                  type: 'nested',
                },
                totalScore: {
                  type: 'float',
                },
                totalScoreNormalized: {
                  type: 'float',
                },
              },
            },
          },
        },
        totalFieldsLimit,
      });

      expect(createOrUpdateIndexTemplate).toHaveBeenCalledWith({
        logger,
        esClient,
        template: {
          name: '.risk-score.risk-score-default-index-template',
          body: {
            data_stream: { hidden: true },
            index_patterns: ['risk-score.risk-score-default'],
            composed_of: ['.risk-score-mappings'],
            template: {
              settings: {
                auto_expand_replicas: '0-1',
                hidden: true,
                'index.lifecycle': {
                  name: '.risk-score-ilm-policy',
                },
                'index.mapping.total_fields.limit': totalFieldsLimit,
              },
              mappings: {
                dynamic: false,
                _meta: {
                  kibana: {
                    version: '8.9.0',
                  },
                  managed: true,
                  namespace: 'default',
                },
              },
            },
            _meta: {
              kibana: {
                version: '8.9.0',
              },
              managed: true,
              namespace: 'default',
            },
          },
        },
      });

      expect(createConcreteWriteIndex).toHaveBeenCalledWith({
        logger,
        esClient,
        totalFieldsLimit,
        indexPatterns: {
          template: `.risk-score.risk-score-default-index-template`,
          alias: `risk-score.risk-score-default`,
          pattern: '',
          basePattern: '',
          name: '',
        },
      });
    });
  });

  describe('initializeResources error', () => {
    it('should handle errors during initialization', async () => {
      const error = new Error('There error');
      (createOrUpdateIlmPolicy as jest.Mock).mockRejectedValue(error);

      await riskEngineDataClient.initializeResources({ namespace: 'default' });

      expect(logger.error).toHaveBeenCalledWith(
        `Error initializing risk engine resources: ${error}`
      );
    });
  });
});
