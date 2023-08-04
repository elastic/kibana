/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import type { TransportResult } from '@elastic/elasticsearch';
// import {
//   TYPE,
//   VERSION,
//   BASE_NEXT_ATTEMPT_DELAY,
// } from './check_metadata_transforms_task';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
// import { TaskStatus } from '@kbn/task-manager-plugin/server';
// import type { RunResult } from '@kbn/task-manager-plugin/server/task';

import { RiskScoringTask } from './risk_scoring_task';
import { riskScoreServiceMock } from '../risk_score_service.mock';
import { riskScoringTaskMock } from './risk_scoring_task.mock';

const ISO_8601_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

describe('Risk Scoring Task', () => {
  let task: RiskScoringTask;
  let mockRiskScoreService: ReturnType<typeof riskScoreServiceMock.create>;
  // let mockCore: CoreSetup;
  let mockTaskManagerSetup: ReturnType<typeof taskManagerMock.createSetup>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    // mockCore = coreMock.createSetup.coreSetupMock();
    mockRiskScoreService = riskScoreServiceMock.create();
    mockTaskManagerSetup = taskManagerMock.createSetup();
    mockTaskManagerStart = taskManagerMock.createStart();
    mockLogger = loggerMock.create();
    task = new RiskScoringTask({
      logger: mockLogger,
      // core: mockCore,
      // taskManager: mockTaskManagerSetup,
    });
  });

  describe('#register', () => {
    it('registers the task with TaskManager', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).not.toHaveBeenCalled();
      task.register(mockTaskManagerSetup);
      expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalled();
    });
  });

  describe('#start', () => {
    it('schedules the task', async () => {
      await task.start({
        taskManager: mockTaskManagerStart,
        riskScoreService: mockRiskScoreService,
      });

      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: { interval: '1h' },
          taskType: 'risk_engine:risk_scoring',
        })
      );
    });
  });

  describe('#runTask()', () => {
    let riskScoringTaskInstanceMock: ReturnType<typeof riskScoringTaskMock.createInstance>;

    beforeEach(async () => {
      await task.start({
        taskManager: mockTaskManagerStart,
        riskScoreService: mockRiskScoreService,
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
        pageSize: 10_000,
        range: { start: 'now-30d', end: 'now' },
      });
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
        await task.runTask(riskScoringTaskInstanceMock);
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
        await task.runTask(riskScoringTaskInstanceMock);
        expect(mockRiskScoreService.getConfiguration).toHaveBeenCalledTimes(1);
      });

      it('invokes the risk score service once for each page of scores', async () => {
        await task.runTask(riskScoringTaskInstanceMock);
        expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledTimes(2);
      });

      it('invokes the risk score service with the persisted configuration', async () => {
        mockRiskScoreService.getConfiguration.mockResolvedValueOnce({
          dataViewId: 'data_view_id',
          enabled: true,
          filter: {
            term: { 'host.name': 'SUSPICIOUS' },
          },
          pageSize: 11_111,
          range: { start: 'now-30d', end: 'now' },
        });
        await task.runTask(riskScoringTaskInstanceMock);

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
        it.todo('does not execute if the risk engine is not enabled');
        it.todo('does not execute if the configuration is not found');
        it.todo('does not execute if the riskScoreService is not available');
      });

      describe('failure conditions', () => {
        it.todo('logs an error and does not execute if the configured range is invalid');
        it.todo('logs an error if the configured filter is invalid');
      });
    });
  });
});
