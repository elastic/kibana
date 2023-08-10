/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { RiskScoreService } from '../risk_score_service';
import { riskScoreServiceMock } from '../risk_score_service.mock';
import { riskScoringTaskMock } from './risk_scoring_task.mock';
import { riskEngineDataClientMock } from '../risk_engine_data_client.mock';
import {
  registerRiskScoringTask,
  startRiskScoringTask,
  removeRiskScoringTask,
  runTask,
} from './risk_scoring_task';

const ISO_8601_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

describe('Risk Scoring Task', () => {
  let mockRiskEngineDataClient: ReturnType<typeof riskEngineDataClientMock.create>;
  let mockRiskScoreService: ReturnType<typeof riskScoreServiceMock.create>;
  let mockCore: ReturnType<typeof coreMock.createSetup>;
  let mockTaskManagerSetup: ReturnType<typeof taskManagerMock.createSetup>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    mockCore = coreMock.createSetup();
    mockRiskEngineDataClient = riskEngineDataClientMock.create();
    mockRiskScoreService = riskScoreServiceMock.create();
    mockTaskManagerSetup = taskManagerMock.createSetup();
    mockTaskManagerStart = taskManagerMock.createStart();
    mockLogger = loggerMock.create();
  });

  describe('registerRiskScoringTask()', () => {
    it('registers the task with TaskManager', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).not.toHaveBeenCalled();
      registerRiskScoringTask({
        getStartServices: mockCore.getStartServices,
        kibanaVersion: '8.10.0',
        taskManager: mockTaskManagerSetup,
        logger: mockLogger,
      });
      expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalled();
    });

    it('does nothing if TaskManager is not available', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).not.toHaveBeenCalled();
      registerRiskScoringTask({
        getStartServices: mockCore.getStartServices,
        kibanaVersion: '8.10.0',
        taskManager: undefined,
        logger: mockLogger,
      });
      expect(mockTaskManagerSetup.registerTaskDefinitions).not.toHaveBeenCalled();
    });
  });

  describe('startRiskScoringTask()', () => {
    it('schedules the task', async () => {
      await startRiskScoringTask({
        logger: mockLogger,
        taskManager: mockTaskManagerStart,
        riskEngineDataClient: mockRiskEngineDataClient,
      });

      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: { interval: '1h' },
          taskType: 'risk_engine:risk_scoring',
        })
      );
    });
  });

  describe('removeRiskScoringTask()', () => {
    it('removes the task', async () => {
      await removeRiskScoringTask({
        logger: mockLogger,
        taskManager: mockTaskManagerStart,
      });

      expect(mockTaskManagerStart.remove).toHaveBeenCalledWith('risk_engine:risk_scoring:0.0.1');
    });

    it('does nothing if task was not found', async () => {
      mockTaskManagerStart.remove.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('type', 'id')
      );
      await removeRiskScoringTask({
        logger: mockLogger,
        taskManager: mockTaskManagerStart,
      });

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('rethrows errors other than "not found"', async () => {
      mockTaskManagerStart.remove.mockRejectedValueOnce(new Error('whoops'));

      await expect(
        removeRiskScoringTask({
          logger: mockLogger,
          taskManager: mockTaskManagerStart,
        })
      ).rejects.toThrowError('whoops');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to remove risk scoring task: whoops');
    });
  });

  describe('runTask()', () => {
    let riskScoringTaskInstanceMock: ReturnType<typeof riskScoringTaskMock.createInstance>;
    let getRiskScoreService: (namespace: string) => Promise<RiskScoreService>;

    beforeEach(async () => {
      await startRiskScoringTask({
        logger: mockLogger,
        taskManager: mockTaskManagerStart,
        riskEngineDataClient: mockRiskEngineDataClient,
      });
      riskScoringTaskInstanceMock = riskScoringTaskMock.createInstance();
      mockRiskScoreService.getRiskInputsIndex.mockResolvedValueOnce({
        index: 'index',
        runtimeMappings: {},
      });
      mockRiskScoreService.getConfiguration.mockResolvedValue({
        dataViewId: 'data_view_id',
        enabled: true,
        filter: {},
        interval: '1h',
        pageSize: 10_000,
        range: { start: 'now-30d', end: 'now' },
      });

      getRiskScoreService = jest.fn().mockResolvedValueOnce(mockRiskScoreService);
    });

    describe('when there are no scores to calculate', () => {
      beforeEach(() => {
        mockRiskScoreService.calculateAndPersistScores.mockResolvedValueOnce({
          after_keys: {},
          scores_written: 0,
          errors: [],
        });
      });

      it('invokes the risk score service only once', async () => {
        await runTask({
          getRiskScoreService,
          logger: mockLogger,
          taskInstance: riskScoringTaskInstanceMock,
        });
        expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledTimes(1);
      });

      it.todo('schedules the next run');
    });

    describe('when there are scores to calculate', () => {
      beforeEach(() => {
        mockRiskScoreService.calculateAndPersistScores
          .mockResolvedValueOnce({
            after_keys: { host: { 'host.name': 'value' } },
            scores_written: 5,
            errors: [],
          })
          .mockResolvedValueOnce({
            after_keys: {},
            scores_written: 5,
            errors: [],
          });
      });

      it('retrieves configuration from the saved object', async () => {
        await runTask({
          getRiskScoreService,
          logger: mockLogger,
          taskInstance: riskScoringTaskInstanceMock,
        });

        expect(mockRiskScoreService.getConfiguration).toHaveBeenCalledTimes(1);
      });

      it('invokes the risk score service once for each page of scores', async () => {
        await runTask({
          getRiskScoreService,
          logger: mockLogger,
          taskInstance: riskScoringTaskInstanceMock,
        });
        expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledTimes(2);
      });

      it('invokes the risk score service with the persisted configuration', async () => {
        mockRiskScoreService.getConfiguration.mockResolvedValueOnce({
          dataViewId: 'data_view_id',
          enabled: true,
          filter: {
            term: { 'host.name': 'SUSPICIOUS' },
          },
          interval: '2h',
          pageSize: 11_111,
          range: { start: 'now-30d', end: 'now' },
        });
        await runTask({
          getRiskScoreService,
          logger: mockLogger,
          taskInstance: riskScoringTaskInstanceMock,
        });

        expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: {
              term: { 'host.name': 'SUSPICIOUS' },
            },
            pageSize: 11_111,
            range: {
              start: expect.stringMatching(ISO_8601_PATTERN),
              end: expect.stringMatching(ISO_8601_PATTERN),
            },
          })
        );
      });

      it.todo('updates the task state');

      describe('short-circuiting', () => {
        it('does not execute if the risk engine is not enabled', async () => {
          mockRiskScoreService.getConfiguration.mockResolvedValueOnce({
            dataViewId: 'data_view_id',
            enabled: false,
            filter: {
              term: { 'host.name': 'SUSPICIOUS' },
            },
            interval: '2h',
            pageSize: 11_111,
            range: { start: 'now-30d', end: 'now' },
          });
          await runTask({
            getRiskScoreService,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
          });

          expect(mockRiskScoreService.calculateAndPersistScores).not.toHaveBeenCalled();
          expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('not enabled'));
        });

        it('does not execute if the configuration is not found', async () => {
          mockRiskScoreService.getConfiguration.mockResolvedValueOnce(null);
          await runTask({
            getRiskScoreService,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
          });

          expect(mockRiskScoreService.calculateAndPersistScores).not.toHaveBeenCalled();
          expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('configuration not found')
          );
        });

        it('does not execute if the riskScoreService is not available', async () => {
          await runTask({
            getRiskScoreService: jest.fn().mockResolvedValueOnce(undefined),
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
          });

          expect(mockRiskScoreService.calculateAndPersistScores).not.toHaveBeenCalled();
          expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('service is not available')
          );
        });
      });

      describe('failure conditions', () => {
        it.todo('logs an error and does not execute if the configured range is invalid');
        it.todo('logs an error if the configured filter is invalid');
      });
    });
  });
});
