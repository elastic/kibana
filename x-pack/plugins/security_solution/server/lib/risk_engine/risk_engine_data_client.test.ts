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
import {
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin/common/model';
import { RiskEngineDataClient } from './risk_engine_data_client';
import { createDataStream } from './utils/create_datastream';

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
        last_updated_by: 'elastic',
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
}));

jest.mock('./utils/create_datastream', () => ({
  createDataStream: jest.fn(),
}));

describe('RiskEngineDataClient', () => {
  let riskEngineDataClient: RiskEngineDataClient;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  const mockSavedObjectClient = savedObjectsClientMock.create();
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

  describe('initializeResources success', () => {
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
    });
  });

  describe('initializeResources error', () => {
    it('should handle errors during initialization', async () => {
      const error = new Error('There error');
      (createOrUpdateIlmPolicy as jest.Mock).mockRejectedValue(error);

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
        savedObjectsClient: mockSavedObjectClient,
      });
      expect(status).toEqual({
        riskEngineStatus: 'NOT_INSTALLED',
        legacyRiskEngineStatus: 'NOT_INSTALLED',
        lastUpdatedBy: '',
      });
    });

    describe('saved object exists and transforms not', () => {
      beforeEach(() => {
        mockSavedObjectClient.find.mockResolvedValue(getSavedObjectConfiguration());
      });

      afterEach(() => {
        mockSavedObjectClient.find.mockReset();
      });

      it('should return status with enabled true', async () => {
        mockSavedObjectClient.find.mockResolvedValue(
          getSavedObjectConfiguration({
            enabled: true,
          })
        );

        const status = await riskEngineDataClient.getStatus({
          namespace: 'default',
          savedObjectsClient: mockSavedObjectClient,
        });
        expect(status).toEqual({
          riskEngineStatus: 'ENABLED',
          legacyRiskEngineStatus: 'NOT_INSTALLED',
          lastUpdatedBy: 'elastic',
        });
      });

      it('should return status with enabled false', async () => {
        mockSavedObjectClient.find.mockResolvedValue(getSavedObjectConfiguration());

        const status = await riskEngineDataClient.getStatus({
          namespace: 'default',
          savedObjectsClient: mockSavedObjectClient,
        });
        expect(status).toEqual({
          riskEngineStatus: 'DISABLED',
          legacyRiskEngineStatus: 'NOT_INSTALLED',
          lastUpdatedBy: 'elastic',
        });
      });
    });

    describe('legacy transforms', () => {
      it('should fetch transforms', async () => {
        await riskEngineDataClient.getStatus({
          namespace: 'default',
          savedObjectsClient: mockSavedObjectClient,
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
          savedObjectsClient: mockSavedObjectClient,
        });

        expect(status).toEqual({
          riskEngineStatus: 'NOT_INSTALLED',
          legacyRiskEngineStatus: 'ENABLED',
          lastUpdatedBy: '',
        });

        esClient.transform.getTransformStats.mockReset();
      });
    });
  });

  describe('enableRiskEngine', () => {
    afterEach(() => {
      mockSavedObjectClient.find.mockReset();
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
        await riskEngineDataClient.enableRiskEngine({
          savedObjectsClient: mockSavedObjectClient,
          user: { username: 'elastic' } as AuthenticatedUser,
        });
      } catch (e) {
        expect(e.message).toEqual('There no saved object configuration for risk engine');
      }
    });

    it('should update saved object attrubute', async () => {
      mockSavedObjectClient.find.mockResolvedValueOnce(getSavedObjectConfiguration());

      await riskEngineDataClient.enableRiskEngine({
        savedObjectsClient: mockSavedObjectClient,
        user: { username: 'elastic' } as AuthenticatedUser,
      });

      expect(mockSavedObjectClient.update).toHaveBeenCalledWith(
        'risk-engine-configuration',
        'de8ca330-2d26-11ee-bc86-f95bf6192ee6',
        {
          enabled: true,
          last_updated_by: 'elastic',
        },
        {
          refresh: 'wait_for',
        }
      );
    });
  });

  describe('disableRiskEngine', () => {
    afterEach(() => {
      mockSavedObjectClient.find.mockReset();
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
        await riskEngineDataClient.disableRiskEngine({
          savedObjectsClient: mockSavedObjectClient,
          user: { username: 'elastic' } as AuthenticatedUser,
        });
      } catch (e) {
        expect(e.message).toEqual('There no saved object configuration for risk engine');
      }
    });

    it('should update saved object attrubute', async () => {
      mockSavedObjectClient.find.mockResolvedValueOnce(getSavedObjectConfiguration());

      await riskEngineDataClient.disableRiskEngine({
        savedObjectsClient: mockSavedObjectClient,
        user: { username: 'elastic' } as AuthenticatedUser,
      });

      expect(mockSavedObjectClient.update).toHaveBeenCalledWith(
        'risk-engine-configuration',
        'de8ca330-2d26-11ee-bc86-f95bf6192ee6',
        {
          enabled: false,
          last_updated_by: 'elastic',
        },
        {
          refresh: 'wait_for',
        }
      );
    });
  });

  describe('init', () => {
    const initializeResourcesMock = jest.spyOn(
      RiskEngineDataClient.prototype,
      'initializeResources'
    );
    const enableRiskEngineMock = jest.spyOn(RiskEngineDataClient.prototype, 'enableRiskEngine');
    const initSavedObjectsMock = jest.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      RiskEngineDataClient.prototype as any,
      'initSavedObjects'
    );
    const disableLegacyRiskEngineMock = jest.spyOn(
      RiskEngineDataClient.prototype,
      'disableLegacyRiskEngine'
    );
    beforeEach(() => {
      disableLegacyRiskEngineMock.mockImplementation(() => Promise.resolve(true));

      initializeResourcesMock.mockImplementation(() => {
        return Promise.resolve();
      });

      enableRiskEngineMock.mockImplementation(() => {
        return Promise.resolve(getSavedObjectConfiguration().saved_objects[0]);
      });

      initSavedObjectsMock.mockImplementation(() => {
        return Promise.resolve();
      });
    });

    afterEach(() => {
      initializeResourcesMock.mockReset();
      enableRiskEngineMock.mockReset();
      initSavedObjectsMock.mockReset();
      disableLegacyRiskEngineMock.mockReset();
    });

    it('success', async () => {
      const initResult = await riskEngineDataClient.init({
        savedObjectsClient: mockSavedObjectClient,
        namespace: 'default',
        user: { username: 'elastic' } as AuthenticatedUser,
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
        savedObjectsClient: mockSavedObjectClient,
        namespace: 'default',
        user: { username: 'elastic' } as AuthenticatedUser,
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
        savedObjectsClient: mockSavedObjectClient,
        namespace: 'default',
        user: { username: 'elastic' } as AuthenticatedUser,
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
        savedObjectsClient: mockSavedObjectClient,
        namespace: 'default',
        user: { username: 'elastic' } as AuthenticatedUser,
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
      initSavedObjectsMock.mockImplementationOnce(() => {
        throw new Error('Error initSavedObjects');
      });

      const initResult = await riskEngineDataClient.init({
        savedObjectsClient: mockSavedObjectClient,
        namespace: 'default',
        user: { username: 'elastic' } as AuthenticatedUser,
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
        savedObjectsClient: mockSavedObjectClient,
        namespace: 'default',
        user: { username: 'elastic' } as AuthenticatedUser,
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
