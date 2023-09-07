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
  getDataStreamAdapter,
} from '@kbn/alerting-plugin/server';
import {
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { SavedObject } from '@kbn/core/server';
import { RiskEngineDataClient } from './risk_engine_data_client';
import type { RiskEngineConfiguration } from './types';
import { createDataStream } from './utils/create_datastream';
import * as savedObjectConfig from './utils/saved_object_configuration';
import * as transforms from './utils/transforms';
import { createIndex } from './utils/create_index';

const getSavedObjectConfiguration = (attributes = {}) => ({
  page: 1,
  per_page: 20,
  total: 1,
  saved_objects: [
    {
      type: 'risk-engine-configuration',
      id: 'de8ca330-2d26-11ee-bc86-f95bf6192ee6',
      namespaces: ['default'],
      attributes: {
        enabled: false,
        ...attributes,
      },
      references: [],
      managed: false,
      updated_at: '2023-07-28T09:52:28.768Z',
      created_at: '2023-07-28T09:12:26.083Z',
      version: 'WzE4MzIsMV0=',
      coreMigrationVersion: '8.8.0',
      score: 0,
    },
  ],
});

const transformsMock = {
  count: 1,
  transforms: [
    {
      id: 'ml_hostriskscore_pivot_transform_default',
      dest: { index: '' },
      source: { index: '' },
    },
  ],
};

jest.mock('@kbn/alerting-plugin/server', () => ({
  createOrUpdateComponentTemplate: jest.fn(),
  createOrUpdateIlmPolicy: jest.fn(),
  createOrUpdateIndexTemplate: jest.fn(),
  getDataStreamAdapter: jest.fn(),
}));

jest.mock('./utils/create_datastream', () => ({
  createDataStream: jest.fn(),
}));

jest.mock('../risk_score/transform/helpers/transforms', () => ({
  createAndStartTransform: jest.fn(),
}));

jest.mock('./utils/create_index', () => ({
  createIndex: jest.fn(),
}));

jest.spyOn(transforms, 'createTransform').mockResolvedValue(Promise.resolve());
jest.spyOn(transforms, 'startTransform').mockResolvedValue(Promise.resolve());

describe('RiskEngineDataClient', () => {
  for (const useDataStreamForAlerts of [false, true]) {
    const label = useDataStreamForAlerts ? 'data streams' : 'aliases';

    describe(`using ${label} for alert indices`, () => {
      let riskEngineDataClient: RiskEngineDataClient;
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
          dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts }),
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
      });

      describe('initializeResources success', () => {
        it('should initialize risk engine resources', async () => {
          await riskEngineDataClient.initializeResources({ namespace: 'default' });

          expect(getDataStreamAdapter).toHaveBeenCalledWith({ useDataStreamForAlerts });

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

          expect(createDataStream).toHaveBeenCalledWith({
            logger,
            esClient,
            totalFieldsLimit,
            indexPatterns: {
              template: `.risk-score.risk-score-default-index-template`,
              alias: `risk-score.risk-score-default`,
            },
          });

          expect(createIndex).toHaveBeenCalledWith({
            logger,
            esClient,
            options: {
              index: `risk-score.risk-score-latest-default`,
              mappings: {
                dynamic: 'strict',
                properties: {
                  '@timestamp': {
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
                  delay: '2s',
                  field: '@timestamp',
                },
              },
              transform_id: 'risk_score_latest_transform_default',
            },
          });

          expect(transforms.startTransform).toHaveBeenCalledWith({
            esClient,
            transformId: 'risk_score_latest_transform_default',
          });
        });
      });

      describe('initializeResources error', () => {
        it('should handle errors during initialization', async () => {
          const error = new Error('There error');
          (createOrUpdateIlmPolicy as jest.Mock).mockRejectedValueOnce(error);

          try {
            await riskEngineDataClient.initializeResources({ namespace: 'default' });
          } catch (e) {
            expect(logger.error).toHaveBeenCalledWith(
              `Error initializing risk engine resources: ${error.message}`
            );
          }
        });
      });

      describe('getStatus', () => {
        it('should return initial status', async () => {
          const status = await riskEngineDataClient.getStatus({
            namespace: 'default',
          });
          expect(status).toEqual({
            isMaxAmountOfRiskEnginesReached: false,
            riskEngineStatus: 'NOT_INSTALLED',
            legacyRiskEngineStatus: 'NOT_INSTALLED',
          });
        });

        describe('saved object exists and transforms not', () => {
          beforeEach(() => {
            mockSavedObjectClient.find.mockResolvedValue(getSavedObjectConfiguration());
          });

          it('should return status with enabled true', async () => {
            mockSavedObjectClient.find.mockResolvedValue(
              getSavedObjectConfiguration({
                enabled: true,
              })
            );

            const status = await riskEngineDataClient.getStatus({
              namespace: 'default',
            });
            expect(status).toEqual({
              isMaxAmountOfRiskEnginesReached: false,
              riskEngineStatus: 'ENABLED',
              legacyRiskEngineStatus: 'NOT_INSTALLED',
            });
          });

          it('should return status with enabled false', async () => {
            mockSavedObjectClient.find.mockResolvedValue(getSavedObjectConfiguration());

            const status = await riskEngineDataClient.getStatus({
              namespace: 'default',
            });
            expect(status).toEqual({
              isMaxAmountOfRiskEnginesReached: false,
              riskEngineStatus: 'DISABLED',
              legacyRiskEngineStatus: 'NOT_INSTALLED',
            });
          });
        });

        describe('legacy transforms', () => {
          it('should fetch transforms', async () => {
            await riskEngineDataClient.getStatus({
              namespace: 'default',
            });

            expect(esClient.transform.getTransform).toHaveBeenCalledTimes(4);
            expect(esClient.transform.getTransform).toHaveBeenNthCalledWith(1, {
              transform_id: 'ml_hostriskscore_pivot_transform_default',
            });
            expect(esClient.transform.getTransform).toHaveBeenNthCalledWith(2, {
              transform_id: 'ml_hostriskscore_latest_transform_default',
            });
            expect(esClient.transform.getTransform).toHaveBeenNthCalledWith(3, {
              transform_id: 'ml_userriskscore_pivot_transform_default',
            });
            expect(esClient.transform.getTransform).toHaveBeenNthCalledWith(4, {
              transform_id: 'ml_userriskscore_latest_transform_default',
            });
          });

          it('should return that legacy transform enabled if at least on transform exist', async () => {
            esClient.transform.getTransform.mockResolvedValueOnce(transformsMock);

            const status = await riskEngineDataClient.getStatus({
              namespace: 'default',
            });

            expect(status).toEqual({
              isMaxAmountOfRiskEnginesReached: false,
              riskEngineStatus: 'NOT_INSTALLED',
              legacyRiskEngineStatus: 'ENABLED',
            });

            esClient.transform.getTransformStats.mockReset();
          });
        });
      });

      describe('#getConfiguration', () => {
        it('retrieves configuration from the saved object', async () => {
          mockSavedObjectClient.find.mockResolvedValueOnce(getSavedObjectConfiguration());

          const configuration = await riskEngineDataClient.getConfiguration();

          expect(mockSavedObjectClient.find).toHaveBeenCalledTimes(1);

          expect(configuration).toEqual({
            enabled: false,
          });
        });
      });

      describe('enableRiskEngine', () => {
        let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;

        beforeEach(() => {
          mockSavedObjectClient.find.mockResolvedValue(getSavedObjectConfiguration());
          mockTaskManagerStart = taskManagerMock.createStart();
        });

        it('returns an error if saved object does not exist', async () => {
          mockSavedObjectClient.find.mockResolvedValue({
            page: 1,
            per_page: 20,
            total: 0,
            saved_objects: [],
          });

          await expect(
            riskEngineDataClient.enableRiskEngine({ taskManager: mockTaskManagerStart })
          ).rejects.toThrow('Risk engine configuration not found');
        });

        it('should update saved object attribute', async () => {
          await riskEngineDataClient.enableRiskEngine({ taskManager: mockTaskManagerStart });

          expect(mockSavedObjectClient.update).toHaveBeenCalledWith(
            'risk-engine-configuration',
            'de8ca330-2d26-11ee-bc86-f95bf6192ee6',
            {
              enabled: true,
            },
            {
              refresh: 'wait_for',
            }
          );
        });

        describe('if task manager throws an error', () => {
          beforeEach(() => {
            mockTaskManagerStart.ensureScheduled.mockRejectedValueOnce(
              new Error('Task Manager error')
            );
          });

          it('disables the risk engine and re-throws the error', async () => {
            await expect(
              riskEngineDataClient.enableRiskEngine({ taskManager: mockTaskManagerStart })
            ).rejects.toThrow('Task Manager error');

            expect(mockSavedObjectClient.update).toHaveBeenCalledWith(
              'risk-engine-configuration',
              'de8ca330-2d26-11ee-bc86-f95bf6192ee6',
              {
                enabled: false,
              },
              {
                refresh: 'wait_for',
              }
            );
          });
        });
      });

      describe('disableRiskEngine', () => {
        let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;

        beforeEach(() => {
          mockTaskManagerStart = taskManagerMock.createStart();
        });

        it('should return error if saved object not exist', async () => {
          mockSavedObjectClient.find.mockResolvedValueOnce({
            page: 1,
            per_page: 20,
            total: 0,
            saved_objects: [],
          });

          expect.assertions(1);
          try {
            await riskEngineDataClient.disableRiskEngine({ taskManager: mockTaskManagerStart });
          } catch (e) {
            expect(e.message).toEqual('Risk engine configuration not found');
          }
        });

        it('should update saved object attrubute', async () => {
          mockSavedObjectClient.find.mockResolvedValueOnce(getSavedObjectConfiguration());

          await riskEngineDataClient.disableRiskEngine({ taskManager: mockTaskManagerStart });

          expect(mockSavedObjectClient.update).toHaveBeenCalledWith(
            'risk-engine-configuration',
            'de8ca330-2d26-11ee-bc86-f95bf6192ee6',
            {
              enabled: false,
            },
            {
              refresh: 'wait_for',
            }
          );
        });
      });

      describe('init', () => {
        let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
        const initializeResourcesMock = jest.spyOn(
          RiskEngineDataClient.prototype,
          'initializeResources'
        );
        const enableRiskEngineMock = jest.spyOn(RiskEngineDataClient.prototype, 'enableRiskEngine');

        const disableLegacyRiskEngineMock = jest.spyOn(
          RiskEngineDataClient.prototype,
          'disableLegacyRiskEngine'
        );
        beforeEach(() => {
          mockTaskManagerStart = taskManagerMock.createStart();
          disableLegacyRiskEngineMock.mockImplementation(() => Promise.resolve(true));

          initializeResourcesMock.mockImplementation(() => {
            return Promise.resolve();
          });

          enableRiskEngineMock.mockImplementation(() => {
            return Promise.resolve(getSavedObjectConfiguration().saved_objects[0]);
          });

          jest
            .spyOn(savedObjectConfig, 'initSavedObjects')
            .mockResolvedValue({} as unknown as SavedObject<RiskEngineConfiguration>);
        });

        afterEach(() => {
          initializeResourcesMock.mockReset();
          enableRiskEngineMock.mockReset();
          disableLegacyRiskEngineMock.mockReset();
        });

        it('success', async () => {
          const initResult = await riskEngineDataClient.init({
            namespace: 'default',
            taskManager: mockTaskManagerStart,
          });

          expect(initResult).toEqual({
            errors: [],
            legacyRiskEngineDisabled: true,
            riskEngineConfigurationCreated: true,
            riskEngineEnabled: true,
            riskEngineResourcesInstalled: true,
          });
        });

        it('should catch error for disableLegacyRiskEngine, but continue', async () => {
          disableLegacyRiskEngineMock.mockImplementation(() => {
            throw new Error('Error disableLegacyRiskEngineMock');
          });
          const initResult = await riskEngineDataClient.init({
            namespace: 'default',
            taskManager: mockTaskManagerStart,
          });

          expect(initResult).toEqual({
            errors: ['Error disableLegacyRiskEngineMock'],
            legacyRiskEngineDisabled: false,
            riskEngineConfigurationCreated: true,
            riskEngineEnabled: true,
            riskEngineResourcesInstalled: true,
          });
        });

        it('should catch error for resource init', async () => {
          disableLegacyRiskEngineMock.mockImplementationOnce(() => {
            throw new Error('Error disableLegacyRiskEngineMock');
          });

          const initResult = await riskEngineDataClient.init({
            namespace: 'default',
            taskManager: mockTaskManagerStart,
          });

          expect(initResult).toEqual({
            errors: ['Error disableLegacyRiskEngineMock'],
            legacyRiskEngineDisabled: false,
            riskEngineConfigurationCreated: true,
            riskEngineEnabled: true,
            riskEngineResourcesInstalled: true,
          });
        });

        it('should catch error for initializeResources and stop', async () => {
          initializeResourcesMock.mockImplementationOnce(() => {
            throw new Error('Error initializeResourcesMock');
          });

          const initResult = await riskEngineDataClient.init({
            namespace: 'default',
            taskManager: mockTaskManagerStart,
          });

          expect(initResult).toEqual({
            errors: ['Error initializeResourcesMock'],
            legacyRiskEngineDisabled: true,
            riskEngineConfigurationCreated: false,
            riskEngineEnabled: false,
            riskEngineResourcesInstalled: false,
          });
        });

        it('should catch error for initSavedObjects and stop', async () => {
          jest.spyOn(savedObjectConfig, 'initSavedObjects').mockImplementationOnce(() => {
            throw new Error('Error initSavedObjects');
          });

          const initResult = await riskEngineDataClient.init({
            namespace: 'default',
            taskManager: mockTaskManagerStart,
          });

          expect(initResult).toEqual({
            errors: ['Error initSavedObjects'],
            legacyRiskEngineDisabled: true,
            riskEngineConfigurationCreated: false,
            riskEngineEnabled: false,
            riskEngineResourcesInstalled: true,
          });
        });

        it('should catch error for enableRiskEngineMock and stop', async () => {
          enableRiskEngineMock.mockImplementationOnce(() => {
            throw new Error('Error enableRiskEngineMock');
          });

          const initResult = await riskEngineDataClient.init({
            namespace: 'default',
            taskManager: mockTaskManagerStart,
          });

          expect(initResult).toEqual({
            errors: ['Error enableRiskEngineMock'],
            legacyRiskEngineDisabled: true,
            riskEngineConfigurationCreated: true,
            riskEngineEnabled: false,
            riskEngineResourcesInstalled: true,
          });
        });
      });
    });
  }
});
