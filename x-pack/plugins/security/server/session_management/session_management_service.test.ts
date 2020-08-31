/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { ConfigSchema, createConfig } from '../config';
import { OnlineStatusRetryScheduler } from '../elasticsearch';
import {
  SessionManagementService,
  SESSION_INDEX_CLEANUP_TASK_NAME,
} from './session_management_service';
import { Session } from './session';
import { SessionIndex } from './session_index';

import { nextTick } from 'test_utils/enzyme_helpers';
import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../task_manager/server/mocks';
import { TaskManagerStartContract } from '../../../task_manager/server';

describe('SessionManagementService', () => {
  let service: SessionManagementService;
  beforeEach(() => {
    service = new SessionManagementService(loggingSystemMock.createLogger());
  });

  describe('setup()', () => {
    it('exposes proper contract', () => {
      const mockCoreSetup = coreMock.createSetup();
      const mockTaskManager = taskManagerMock.createSetup();

      expect(
        service.setup({
          clusterClient: elasticsearchServiceMock.createLegacyClusterClient(),
          http: mockCoreSetup.http,
          config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
            isTLSEnabled: false,
          }),
          kibanaIndexName: '.kibana',
          taskManager: mockTaskManager,
        })
      ).toEqual({ session: expect.any(Session) });

      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledWith({
        [SESSION_INDEX_CLEANUP_TASK_NAME]: {
          title: 'Cleanup expired or invalid user sessions',
          type: SESSION_INDEX_CLEANUP_TASK_NAME,
          createTaskRunner: expect.any(Function),
        },
      });
    });

    it('registers proper session index cleanup task runner', () => {
      const mockSessionIndexCleanUp = jest.spyOn(SessionIndex.prototype, 'cleanUp');
      const mockTaskManager = taskManagerMock.createSetup();

      const mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();
      mockClusterClient.callAsInternalUser.mockResolvedValue({});
      service.setup({
        clusterClient: mockClusterClient,
        http: coreMock.createSetup().http,
        config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
          isTLSEnabled: false,
        }),
        kibanaIndexName: '.kibana',
        taskManager: mockTaskManager,
      });

      const [
        [
          {
            [SESSION_INDEX_CLEANUP_TASK_NAME]: { createTaskRunner },
          },
        ],
      ] = mockTaskManager.registerTaskDefinitions.mock.calls;
      expect(mockSessionIndexCleanUp).not.toHaveBeenCalled();

      const runner = createTaskRunner({} as any);
      runner.run();
      expect(mockSessionIndexCleanUp).toHaveBeenCalledTimes(1);

      runner.run();
      expect(mockSessionIndexCleanUp).toHaveBeenCalledTimes(2);
    });
  });

  describe('start()', () => {
    let mockSessionIndexInitialize: jest.SpyInstance;
    let mockTaskManager: jest.Mocked<TaskManagerStartContract>;
    beforeEach(() => {
      mockSessionIndexInitialize = jest.spyOn(SessionIndex.prototype, 'initialize');

      mockTaskManager = taskManagerMock.createStart();
      mockTaskManager.ensureScheduled.mockResolvedValue(undefined as any);

      const mockCoreSetup = coreMock.createSetup();
      service.setup({
        clusterClient: elasticsearchServiceMock.createLegacyClusterClient(),
        http: mockCoreSetup.http,
        config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
          isTLSEnabled: false,
        }),
        kibanaIndexName: '.kibana',
        taskManager: taskManagerMock.createSetup(),
      });
    });

    afterEach(() => {
      mockSessionIndexInitialize.mockReset();
    });

    it('exposes proper contract', () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      expect(
        service.start({ online$: mockStatusSubject.asObservable(), taskManager: mockTaskManager })
      ).toBeUndefined();
    });

    it('initializes session index and schedules session index cleanup task when Elasticsearch goes online', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({ online$: mockStatusSubject.asObservable(), taskManager: mockTaskManager });

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
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(2);

      expect(mockScheduleRetry).not.toHaveBeenCalled();
    });

    it('removes old cleanup task if cleanup interval changes', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({ online$: mockStatusSubject.asObservable(), taskManager: mockTaskManager });

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
      service.start({ online$: mockStatusSubject.asObservable(), taskManager: mockTaskManager });

      mockTaskManager.get.mockResolvedValue({ schedule: { interval: '3600s' } } as any);

      // ES isn't online yet.
      expect(mockTaskManager.ensureScheduled).not.toHaveBeenCalled();

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();

      expect(mockTaskManager.get).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.get).toHaveBeenCalledWith(SESSION_INDEX_CLEANUP_TASK_NAME);

      expect(mockTaskManager.remove).not.toHaveBeenCalled();

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

    it('schedules retry if index initialization fails', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({ online$: mockStatusSubject.asObservable(), taskManager: mockTaskManager });

      mockSessionIndexInitialize.mockRejectedValue(new Error('ugh :/'));

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
      mockSessionIndexInitialize.mockResolvedValue(undefined);

      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(3);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(3);
      expect(mockScheduleRetry).toHaveBeenCalledTimes(2);
    });

    it('schedules retry if cleanup task registration fails', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({ online$: mockStatusSubject.asObservable(), taskManager: mockTaskManager });

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
    let mockSessionIndexInitialize: jest.SpyInstance;
    let mockTaskManager: jest.Mocked<TaskManagerStartContract>;
    beforeEach(() => {
      mockSessionIndexInitialize = jest.spyOn(SessionIndex.prototype, 'initialize');

      mockTaskManager = taskManagerMock.createStart();
      mockTaskManager.ensureScheduled.mockResolvedValue(undefined as any);

      const mockCoreSetup = coreMock.createSetup();
      service.setup({
        clusterClient: elasticsearchServiceMock.createLegacyClusterClient(),
        http: mockCoreSetup.http,
        config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
          isTLSEnabled: false,
        }),
        kibanaIndexName: '.kibana',
        taskManager: taskManagerMock.createSetup(),
      });
    });

    afterEach(() => {
      mockSessionIndexInitialize.mockReset();
    });

    it('properly unsubscribes from status updates', () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({ online$: mockStatusSubject.asObservable(), taskManager: mockTaskManager });

      service.stop();

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });

      expect(mockSessionIndexInitialize).not.toHaveBeenCalled();
      expect(mockScheduleRetry).not.toHaveBeenCalled();
    });
  });
});
