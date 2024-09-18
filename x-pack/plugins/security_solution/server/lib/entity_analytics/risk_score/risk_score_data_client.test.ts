/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createOrUpdateComponentTemplate,
  createOrUpdateIndexTemplate,
} from '@kbn/alerting-plugin/server';
import {
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { RiskScoreDataClient } from './risk_score_data_client';

import { createDataStream } from '../utils/create_datastream';

import * as transforms from '../utils/transforms';
import { createOrUpdateIndex } from '../utils/create_or_update_index';

jest.mock('@kbn/alerting-plugin/server', () => ({
  createOrUpdateComponentTemplate: jest.fn(),
  createOrUpdateIndexTemplate: jest.fn(),
}));

jest.mock('../utils/create_datastream', () => ({
  createDataStream: jest.fn(),
}));

jest.mock('../utils/create_or_update_index', () => ({
  createOrUpdateIndex: jest.fn(),
}));

jest.spyOn(transforms, 'createTransform').mockResolvedValue(Promise.resolve());
jest.spyOn(transforms, 'scheduleTransformNow').mockResolvedValue(Promise.resolve());

describe('RiskScoreDataClient', () => {
  let riskScoreDataClient: RiskScoreDataClient;
  let mockSavedObjectClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
  const totalFieldsLimit = 1000;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    mockSavedObjectClient = savedObjectsClientMock.create();
    const options = {
      logger,
      kibanaVersion: '8.9.0',
      esClient,
      soClient: mockSavedObjectClient,
      namespace: 'default',
    };
    riskScoreDataClient = new RiskScoreDataClient(options);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWriter', () => {
    it('should return a writer object', async () => {
      const writer = await riskScoreDataClient.getWriter({ namespace: 'default' });
      expect(writer).toBeDefined();
      expect(typeof writer?.bulk).toBe('function');
    });

    it('should cache and return the same writer for the same namespace', async () => {
      const writer1 = await riskScoreDataClient.getWriter({ namespace: 'default' });
      const writer2 = await riskScoreDataClient.getWriter({ namespace: 'default' });
      const writer3 = await riskScoreDataClient.getWriter({ namespace: 'space-1' });

      expect(writer1).toEqual(writer2);
      expect(writer2).not.toEqual(writer3);
    });
  });

  describe('init success', () => {
    it('should initialize risk engine resources', async () => {
      await riskScoreDataClient.init();

      expect(createOrUpdateComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          logger,
          esClient,
          template: expect.objectContaining({
            name: '.risk-score-mappings',
            _meta: {
              managed: true,
            },
          }),
          totalFieldsLimit: 1000,
        })
      );
      expect((createOrUpdateComponentTemplate as jest.Mock).mock.lastCall[0].template.template)
        .toMatchInlineSnapshot(`
            Object {
              "mappings": Object {
                "dynamic": "strict",
                "properties": Object {
                  "@timestamp": Object {
                    "ignore_malformed": false,
                    "type": "date",
                  },
                  "host": Object {
                    "properties": Object {
                      "name": Object {
                        "type": "keyword",
                      },
                      "risk": Object {
                        "properties": Object {
                          "calculated_level": Object {
                            "type": "keyword",
                          },
                          "calculated_score": Object {
                            "type": "float",
                          },
                          "calculated_score_norm": Object {
                            "type": "float",
                          },
                          "category_1_count": Object {
                            "type": "long",
                          },
                          "category_1_score": Object {
                            "type": "float",
                          },
                          "id_field": Object {
                            "type": "keyword",
                          },
                          "id_value": Object {
                            "type": "keyword",
                          },
                          "inputs": Object {
                            "properties": Object {
                              "category": Object {
                                "type": "keyword",
                              },
                              "description": Object {
                                "type": "keyword",
                              },
                              "id": Object {
                                "type": "keyword",
                              },
                              "index": Object {
                                "type": "keyword",
                              },
                              "risk_score": Object {
                                "type": "float",
                              },
                              "timestamp": Object {
                                "type": "date",
                              },
                            },
                            "type": "object",
                          },
                          "notes": Object {
                            "type": "keyword",
                          },
                        },
                        "type": "object",
                      },
                    },
                  },
                  "user": Object {
                    "properties": Object {
                      "name": Object {
                        "type": "keyword",
                      },
                      "risk": Object {
                        "properties": Object {
                          "calculated_level": Object {
                            "type": "keyword",
                          },
                          "calculated_score": Object {
                            "type": "float",
                          },
                          "calculated_score_norm": Object {
                            "type": "float",
                          },
                          "category_1_count": Object {
                            "type": "long",
                          },
                          "category_1_score": Object {
                            "type": "float",
                          },
                          "id_field": Object {
                            "type": "keyword",
                          },
                          "id_value": Object {
                            "type": "keyword",
                          },
                          "inputs": Object {
                            "properties": Object {
                              "category": Object {
                                "type": "keyword",
                              },
                              "description": Object {
                                "type": "keyword",
                              },
                              "id": Object {
                                "type": "keyword",
                              },
                              "index": Object {
                                "type": "keyword",
                              },
                              "risk_score": Object {
                                "type": "float",
                              },
                              "timestamp": Object {
                                "type": "date",
                              },
                            },
                            "type": "object",
                          },
                          "notes": Object {
                            "type": "keyword",
                          },
                        },
                        "type": "object",
                      },
                    },
                  },
                },
              },
              "settings": Object {},
            }
          `);

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
              lifecycle: {},
              settings: {
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

      expect(createDataStream).toHaveBeenCalledWith({
        logger,
        esClient,
        totalFieldsLimit,
        indexPatterns: {
          template: `.risk-score.risk-score-default-index-template`,
          alias: `risk-score.risk-score-default`,
        },
      });

      expect(createOrUpdateIndex).toHaveBeenCalledWith({
        logger,
        esClient,
        options: {
          index: `risk-score.risk-score-latest-default`,
          mappings: {
            dynamic: false,
            properties: {
              '@timestamp': {
                ignore_malformed: false,
                type: 'date',
              },
              host: {
                properties: {
                  name: {
                    type: 'keyword',
                  },
                  risk: {
                    properties: {
                      calculated_level: {
                        type: 'keyword',
                      },
                      calculated_score: {
                        type: 'float',
                      },
                      calculated_score_norm: {
                        type: 'float',
                      },
                      category_1_count: {
                        type: 'long',
                      },
                      category_1_score: {
                        type: 'float',
                      },
                      id_field: {
                        type: 'keyword',
                      },
                      id_value: {
                        type: 'keyword',
                      },
                      inputs: {
                        properties: {
                          category: {
                            type: 'keyword',
                          },
                          description: {
                            type: 'keyword',
                          },
                          id: {
                            type: 'keyword',
                          },
                          index: {
                            type: 'keyword',
                          },
                          risk_score: {
                            type: 'float',
                          },
                          timestamp: {
                            type: 'date',
                          },
                        },
                        type: 'object',
                      },
                      notes: {
                        type: 'keyword',
                      },
                    },
                    type: 'object',
                  },
                },
              },
              user: {
                properties: {
                  name: {
                    type: 'keyword',
                  },
                  risk: {
                    properties: {
                      calculated_level: {
                        type: 'keyword',
                      },
                      calculated_score: {
                        type: 'float',
                      },
                      calculated_score_norm: {
                        type: 'float',
                      },
                      category_1_count: {
                        type: 'long',
                      },
                      category_1_score: {
                        type: 'float',
                      },
                      id_field: {
                        type: 'keyword',
                      },
                      id_value: {
                        type: 'keyword',
                      },
                      inputs: {
                        properties: {
                          category: {
                            type: 'keyword',
                          },
                          description: {
                            type: 'keyword',
                          },
                          id: {
                            type: 'keyword',
                          },
                          index: {
                            type: 'keyword',
                          },
                          risk_score: {
                            type: 'float',
                          },
                          timestamp: {
                            type: 'date',
                          },
                        },
                        type: 'object',
                      },
                      notes: {
                        type: 'keyword',
                      },
                    },
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      });

      expect(transforms.createTransform).toHaveBeenCalledWith({
        logger,
        esClient,
        transform: {
          dest: {
            index: 'risk-score.risk-score-latest-default',
          },
          frequency: '1h',
          latest: {
            sort: '@timestamp',
            unique_key: ['host.name', 'user.name'],
          },
          source: {
            index: ['risk-score.risk-score-default'],
          },
          sync: {
            time: {
              delay: '0s',
              field: '@timestamp',
            },
          },
          transform_id: 'risk_score_latest_transform_default',
          settings: {
            unattended: true,
          },
          _meta: {
            version: 2,
            managed: true,
            managed_by: 'security-entity-analytics',
          },
        },
      });
    });
  });

  describe('init error', () => {
    it('should handle errors during initialization', async () => {
      const error = new Error('There error');
      (createOrUpdateIndexTemplate as jest.Mock).mockRejectedValueOnce(error);

      try {
        await riskScoreDataClient.init();
      } catch (e) {
        expect(logger.error).toHaveBeenCalledWith(
          `Error initializing risk engine resources: ${error.message}`
        );
      }
    });
  });
  describe('upgrade process', () => {
    it('upserts the configuration for the latest risk score index when upgrading', async () => {
      await riskScoreDataClient.upgradeIfNeeded();

      expect(esClient.indices.putMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          dynamic: 'false',
        })
      );
    });
  });

  describe('tearDown', () => {
    it('deletes all resources', async () => {
      const errors = await riskScoreDataClient.tearDown();

      expect(esClient.transform.deleteTransform).toHaveBeenCalledTimes(1);
      expect(esClient.indices.deleteDataStream).toHaveBeenCalledTimes(1);
      expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledTimes(1);
      expect(esClient.cluster.deleteComponentTemplate).toHaveBeenCalledTimes(1);
      expect(errors).toEqual([]);
    });

    it('returns errors when promises are rejected', async () => {
      const error = new Error('test error');

      esClient.transform.deleteTransform.mockRejectedValueOnce(error);
      esClient.indices.deleteDataStream.mockRejectedValueOnce(error);
      esClient.indices.deleteIndexTemplate.mockRejectedValueOnce(error);
      esClient.cluster.deleteComponentTemplate.mockRejectedValueOnce(error);

      const errors = await riskScoreDataClient.tearDown();

      expect(errors).toEqual([error, error, error, error]);
    });
  });
});
