/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';

import { nextTick } from '@kbn/test-jest-helpers';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';

import type {
  TaskManagerStartContract,
  TaskRunCreatorFunction,
} from '../../../task_manager/server';
import { taskManagerMock } from '../../../task_manager/server/mocks';
import type { AuditLogger } from '../audit';
import { auditLoggerMock } from '../audit/mocks';
import { ConfigSchema, createConfig } from '../config';
import type { OnlineStatusRetryScheduler } from '../elasticsearch';
import { Session } from './session';
import { SessionIndex } from './session_index';
import {
  SESSION_INDEX_CLEANUP_TASK_NAME,
  SessionManagementService,
} from './session_management_service';

const mockSessionIndexInitialize = jest.spyOn(SessionIndex.prototype, 'initialize');
mockSessionIndexInitialize.mockResolvedValue();

const mockSessionIndexCleanUp = jest.spyOn(SessionIndex.prototype, 'cleanUp');
mockSessionIndexCleanUp.mockResolvedValue();

describe('SessionManagementService', () => {
  let service: SessionManagementService;
  let auditLogger: AuditLogger;
  beforeEach(() => {
    service = new SessionManagementService(loggingSystemMock.createLogger());
    auditLogger = auditLoggerMock.create();
  });

  afterEach(() => {
    mockSessionIndexInitialize.mockReset();
    mockSessionIndexCleanUp.mockReset();
  });

  describe('setup()', () => {
    it('registers cleanup task', () => {
      const mockCoreSetup = coreMock.createSetup();
      const mockTaskManager = taskManagerMock.createSetup();

      expect(
        service.setup({
          http: mockCoreSetup.http,
          config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
            isTLSEnabled: false,
          }),
          taskManager: mockTaskManager,
        })
      ).toBeUndefined();

      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledWith({
        [SESSION_INDEX_CLEANUP_TASK_NAME]: {
          title: 'Cleanup expired or invalid user sessions',
          createTaskRunner: expect.any(Function),
        },
      });
    });
  });

  describe('start()', () => {
    let mockTaskManager: jest.Mocked<TaskManagerStartContract>;
    let sessionCleanupTaskRunCreator: TaskRunCreatorFunction;
    beforeEach(() => {
      mockTaskManager = taskManagerMock.createStart();
      mockTaskManager.ensureScheduled.mockResolvedValue(undefined as any);

      const mockTaskManagerSetup = taskManagerMock.createSetup();
      service.setup({
        http: coreMock.createSetup().http,
        config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
          isTLSEnabled: false,
        }),
        taskManager: mockTaskManagerSetup,
      });

      const [
        [
          {
            [SESSION_INDEX_CLEANUP_TASK_NAME]: { createTaskRunner },
          },
        ],
      ] = mockTaskManagerSetup.registerTaskDefinitions.mock.calls;
      sessionCleanupTaskRunCreator = createTaskRunner;
    });

    it('exposes proper contract', () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      expect(
        service.start({
          auditLogger,
          elasticsearchClient: elasticsearchServiceMock.createElasticsearchClient(),
          kibanaIndexName: '.kibana',
          online$: mockStatusSubject.asObservable(),
          taskManager: mockTaskManager,
        })
      ).toEqual({ session: expect.any(Session) });
    });

    it('registers proper session index cleanup task runner', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({
        auditLogger,
        elasticsearchClient: elasticsearchServiceMock.createElasticsearchClient(),
        kibanaIndexName: '.kibana',
        online$: mockStatusSubject.asObservable(),
        taskManager: mockTaskManager,
      });

      expect(mockSessionIndexCleanUp).not.toHaveBeenCalled();

      const runner = sessionCleanupTaskRunCreator({} as any);
      await runner.run();
      expect(mockSessionIndexCleanUp).toHaveBeenCalledTimes(1);

      await runner.run();
      expect(mockSessionIndexCleanUp).toHaveBeenCalledTimes(2);
    });

    it('initializes session index and schedules session index cleanup task when Elasticsearch goes online', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({
        auditLogger,
        elasticsearchClient: elasticsearchServiceMock.createElasticsearchClient(),
        kibanaIndexName: '.kibana',
        online$: mockStatusSubject.asObservable(),
        taskManager: mockTaskManager,
      });

      // ES isn't online yet.
      expect(mockSessionIndexInitialize).not.toHaveBeenCalled();
      expect(mockTaskManager.ensureScheduled).not.toHaveBeenCalled();

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith({
        id: SESSION_INDEX_CLEANUP_TASK_NAME,
        taskType: SESSION_INDEX_CLEANUP_TASK_NAME,
        scope: ['security'],
        schedule: { interval: '3600s' },
        params: {},
        state: {},
      });

      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(2);

      // Session index task shouldn't be scheduled twice due to TM issue.
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(1);

      expect(mockScheduleRetry).not.toHaveBeenCalled();
    });

    it('removes old cleanup task if cleanup interval changes', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({
        auditLogger,
        elasticsearchClient: elasticsearchServiceMock.createElasticsearchClient(),
        kibanaIndexName: '.kibana',
        online$: mockStatusSubject.asObservable(),
        taskManager: mockTaskManager,
      });

      mockTaskManager.get.mockResolvedValue({ schedule: { interval: '2000s' } } as any);

      // ES isn't online yet.
      expect(mockTaskManager.ensureScheduled).not.toHaveBeenCalled();

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();

      expect(mockTaskManager.get).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.get).toHaveBeenCalledWith(SESSION_INDEX_CLEANUP_TASK_NAME);

      expect(mockTaskManager.remove).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.remove).toHaveBeenCalledWith(SESSION_INDEX_CLEANUP_TASK_NAME);

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith({
        id: SESSION_INDEX_CLEANUP_TASK_NAME,
        taskType: SESSION_INDEX_CLEANUP_TASK_NAME,
        scope: ['security'],
        schedule: { interval: '3600s' },
        params: {},
        state: {},
      });
    });

    it('does not remove old cleanup task if cleanup interval does not change', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({
        auditLogger,
        elasticsearchClient: elasticsearchServiceMock.createElasticsearchClient(),
        kibanaIndexName: '.kibana',
        online$: mockStatusSubject.asObservable(),
        taskManager: mockTaskManager,
      });

      mockTaskManager.get.mockResolvedValue({ schedule: { interval: '3600s' } } as any);

      // ES isn't online yet.
      expect(mockTaskManager.ensureScheduled).not.toHaveBeenCalled();

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();

      expect(mockTaskManager.get).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.get).toHaveBeenCalledWith(SESSION_INDEX_CLEANUP_TASK_NAME);

      expect(mockTaskManager.remove).not.toHaveBeenCalled();
      // No need to schedule a task if Task Manager says it's already scheduled.
      expect(mockTaskManager.ensureScheduled).not.toHaveBeenCalled();
    });

    it('schedules retry if index initialization fails', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({
        auditLogger,
        elasticsearchClient: elasticsearchServiceMock.createElasticsearchClient(),
        kibanaIndexName: '.kibana',
        online$: mockStatusSubject.asObservable(),
        taskManager: mockTaskManager,
      });

      mockSessionIndexInitialize.mockRejectedValue(new Error('ugh :/'));

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(1);
      expect(mockScheduleRetry).toHaveBeenCalledTimes(1);

      // Still fails, but cleanup task is scheduled already
      mockTaskManager.get.mockResolvedValue({ schedule: { interval: '3600s' } } as any);
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(2);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(1);
      expect(mockScheduleRetry).toHaveBeenCalledTimes(2);

      // And finally succeeds, retry is not scheduled.
      mockSessionIndexInitialize.mockResolvedValue(undefined);

      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(3);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(1);
      expect(mockScheduleRetry).toHaveBeenCalledTimes(2);
    });

    it('schedules retry if cleanup task registration fails', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({
        auditLogger,
        elasticsearchClient: elasticsearchServiceMock.createElasticsearchClient(),
        kibanaIndexName: '.kibana',
        online$: mockStatusSubject.asObservable(),
        taskManager: mockTaskManager,
      });

      mockTaskManager.ensureScheduled.mockRejectedValue(new Error('ugh :/'));

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(1);
      expect(mockScheduleRetry).toHaveBeenCalledTimes(1);

      // Still fails.
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(2);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(2);
      expect(mockScheduleRetry).toHaveBeenCalledTimes(2);

      // And finally succeeds, retry is not scheduled.
      mockTaskManager.ensureScheduled.mockResolvedValue(undefined as any);

      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(3);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(3);
      expect(mockScheduleRetry).toHaveBeenCalledTimes(2);
    });
  });

  describe('stop()', () => {
    let mockTaskManager: jest.Mocked<TaskManagerStartContract>;
    beforeEach(() => {
      mockTaskManager = taskManagerMock.createStart();
      mockTaskManager.ensureScheduled.mockResolvedValue(undefined as any);

      const mockCoreSetup = coreMock.createSetup();
      service.setup({
        http: mockCoreSetup.http,
        config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
          isTLSEnabled: false,
        }),
        taskManager: taskManagerMock.createSetup(),
      });
    });

    it('properly unsubscribes from status updates', () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({
        auditLogger,
        elasticsearchClient: elasticsearchServiceMock.createElasticsearchClient(),
        kibanaIndexName: '.kibana',
        online$: mockStatusSubject.asObservable(),
        taskManager: mockTaskManager,
      });

      service.stop();

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });

      expect(mockSessionIndexInitialize).not.toHaveBeenCalled();
      expect(mockScheduleRetry).not.toHaveBeenCalled();
    });
  });
});
