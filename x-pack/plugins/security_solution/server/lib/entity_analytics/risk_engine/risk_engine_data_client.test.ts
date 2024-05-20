/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { SavedObject } from '@kbn/core/server';
import { RiskEngineDataClient } from './risk_engine_data_client';
import { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import type { RiskEngineConfiguration } from '../types';
import * as savedObjectConfig from './utils/saved_object_configuration';
import * as transforms from '../utils/transforms';
import { riskScoreDataClientMock } from '../risk_score/risk_score_data_client.mock';

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
jest.spyOn(transforms, 'startTransform').mockResolvedValue(Promise.resolve());

describe('RiskEngineDataClient', () => {
  for (const useDataStreamForAlerts of [false, true]) {
    const label = useDataStreamForAlerts ? 'data streams' : 'aliases';

    describe(`using ${label} for alert indices`, () => {
      let riskEngineDataClient: RiskEngineDataClient;
      let mockSavedObjectClient: ReturnType<typeof savedObjectsClientMock.create>;
      let logger: ReturnType<typeof loggingSystemMock.createLogger>;
      const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;

      beforeEach(() => {
        logger = loggingSystemMock.createLogger();
        mockSavedObjectClient = savedObjectsClientMock.create();
        const options = {
          logger,
          kibanaVersion: '8.9.0',
          esClient,
          soClient: mockSavedObjectClient,
          namespace: 'default',
          auditLogger: undefined,
        };
        riskEngineDataClient = new RiskEngineDataClient(options);
      });

      afterEach(() => {
        jest.clearAllMocks();
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
        const initRiskScore = jest.spyOn(RiskScoreDataClient.prototype, 'init');
        const enableRiskEngineMock = jest.spyOn(RiskEngineDataClient.prototype, 'enableRiskEngine');

        const disableLegacyRiskEngineMock = jest.spyOn(
          RiskEngineDataClient.prototype,
          'disableLegacyRiskEngine'
        );
        beforeEach(() => {
          mockTaskManagerStart = taskManagerMock.createStart();
          disableLegacyRiskEngineMock.mockImplementation(() => Promise.resolve(true));

          initRiskScore.mockImplementation(() => {
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
          initRiskScore.mockReset();
          enableRiskEngineMock.mockReset();
          disableLegacyRiskEngineMock.mockReset();
        });

        it('success', async () => {
          const initResult = await riskEngineDataClient.init({
            namespace: 'default',
            taskManager: mockTaskManagerStart,
            riskScoreDataClient: riskScoreDataClientMock.create(),
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
            riskScoreDataClient: riskScoreDataClientMock.create(),
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
            riskScoreDataClient: riskScoreDataClientMock.create(),
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
          const riskScoreDataClient = riskScoreDataClientMock.create();
          riskScoreDataClient.init.mockImplementationOnce(() => {
            throw new Error('Error riskScoreDataClient');
          });

          const initResult = await riskEngineDataClient.init({
            namespace: 'default',
            taskManager: mockTaskManagerStart,
            riskScoreDataClient,
          });

          expect(initResult).toEqual({
            errors: ['Error riskScoreDataClient'],
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
            riskScoreDataClient: riskScoreDataClientMock.create(),
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
            riskScoreDataClient: riskScoreDataClientMock.create(),
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
