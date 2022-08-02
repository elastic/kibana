/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerPlugin, getElasticsearchAndSOAvailability } from './plugin';
import { coreMock } from '@kbn/core/server/mocks';
import { TaskManagerConfig } from './config';
import { Subject } from 'rxjs';
import { bufferCount, take } from 'rxjs/operators';
import { CoreStatus, ServiceStatusLevels } from '@kbn/core/server';
import { taskPollingLifecycleMock } from './polling_lifecycle.mock';
import { TaskPollingLifecycle } from './polling_lifecycle';
import type { TaskPollingLifecycle as TaskPollingLifecycleClass } from './polling_lifecycle';
import { ephemeralTaskLifecycleMock } from './ephemeral_task_lifecycle.mock';
import { EphemeralTaskLifecycle } from './ephemeral_task_lifecycle';
import type { EphemeralTaskLifecycle as EphemeralTaskLifecycleClass } from './ephemeral_task_lifecycle';

let mockTaskPollingLifecycle = taskPollingLifecycleMock.create({});
jest.mock('./polling_lifecycle', () => {
  return {
    TaskPollingLifecycle: jest.fn().mockImplementation(() => {
      return mockTaskPollingLifecycle;
    }),
  };
});

let mockEphemeralTaskLifecycle = ephemeralTaskLifecycleMock.create({});
jest.mock('./ephemeral_task_lifecycle', () => {
  return {
    EphemeralTaskLifecycle: jest.fn().mockImplementation(() => {
      return mockEphemeralTaskLifecycle;
    }),
  };
});

const coreStart = coreMock.createStart();
const pluginInitializerContextParams = {
  max_workers: 10,
  max_attempts: 9,
  poll_interval: 3000,
  version_conflict_threshold: 80,
  max_poll_inactivity_cycles: 10,
  request_capacity: 1000,
  monitored_aggregated_stats_refresh_rate: 5000,
  monitored_stats_health_verbose_log: {
    enabled: false,
    warn_delayed_task_start_in_seconds: 60,
  },
  monitored_stats_required_freshness: 5000,
  monitored_stats_running_average_window: 50,
  monitored_task_execution_thresholds: {
    default: {
      error_threshold: 90,
      warn_threshold: 80,
    },
    custom: {},
  },
  ephemeral_tasks: {
    enabled: false,
    request_capacity: 10,
  },
  unsafe: {
    exclude_task_types: [],
  },
  event_loop_delay: {
    monitor: true,
    warn_threshold: 5000,
  },
};

describe('TaskManagerPlugin', () => {
  beforeEach(() => {
    mockTaskPollingLifecycle = taskPollingLifecycleMock.create({});
    (TaskPollingLifecycle as jest.Mock<TaskPollingLifecycleClass>).mockClear();
    mockEphemeralTaskLifecycle = ephemeralTaskLifecycleMock.create({});
    (EphemeralTaskLifecycle as jest.Mock<EphemeralTaskLifecycleClass>).mockClear();
  });

  describe('setup', () => {
    test('throws if no valid UUID is available', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );

      pluginInitializerContext.env.instanceUuid = '';

      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      expect(() =>
        taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined })
      ).toThrow(
        new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`)
      );
    });

    test('throws if setup methods are called after start', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );

      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);

      const setupApi = await taskManagerPlugin.setup(coreMock.createSetup(), {
        usageCollection: undefined,
      });

      // we only start a poller if we have task types that we support and we track
      // phases (moving from Setup to Start) based on whether the poller is working
      setupApi.registerTaskDefinitions({
        setupTimeType: {
          title: 'setupTimeType',
          createTaskRunner: () => ({ async run() {} }),
        },
      });

      await taskManagerPlugin.start(coreMock.createStart());

      expect(() =>
        setupApi.addMiddleware({
          beforeSave: async (saveOpts) => saveOpts,
          beforeRun: async (runOpts) => runOpts,
          beforeMarkRunning: async (runOpts) => runOpts,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot add Middleware after the task manager has started"`
      );

      expect(() =>
        setupApi.registerTaskDefinitions({
          lateRegisteredType: {
            title: 'lateRegisteredType',
            createTaskRunner: () => ({ async run() {} }),
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot register task definitions after the task manager has started"`
      );
    });

    test('it logs a warning when the unsafe `exclude_task_types` config is used', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        ...pluginInitializerContextParams,
        unsafe: {
          exclude_task_types: ['*'],
        },
      });

      const logger = pluginInitializerContext.logger.get();
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      expect((logger.warn as jest.Mock).mock.calls.length).toBe(1);
      expect((logger.warn as jest.Mock).mock.calls[0][0]).toBe(
        'Excluding task types from execution: *'
      );
    });
  });

  describe('start', () => {
    test('should initialize task polling lifecycle if node.roles.backgroundTasks is true', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = true;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart);

      expect(TaskPollingLifecycle as jest.Mock<TaskPollingLifecycleClass>).toHaveBeenCalledTimes(1);
      expect(
        EphemeralTaskLifecycle as jest.Mock<EphemeralTaskLifecycleClass>
      ).toHaveBeenCalledTimes(1);
    });

    test('should not initialize task polling lifecycle if node.roles.backgroundTasks is false', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>(
        pluginInitializerContextParams
      );
      pluginInitializerContext.node.roles.backgroundTasks = false;
      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      taskManagerPlugin.setup(coreMock.createSetup(), { usageCollection: undefined });
      taskManagerPlugin.start(coreStart);

      expect(TaskPollingLifecycle as jest.Mock<TaskPollingLifecycleClass>).not.toHaveBeenCalled();
      expect(
        EphemeralTaskLifecycle as jest.Mock<EphemeralTaskLifecycleClass>
      ).not.toHaveBeenCalled();
    });
  });

  describe('getElasticsearchAndSOAvailability', () => {
    test('returns true when both services are available', async () => {
      const core$ = new Subject<CoreStatus>();

      const availability = getElasticsearchAndSOAvailability(core$)
        .pipe(take(1), bufferCount(1))
        .toPromise();

      core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: true }));

      expect(await availability).toEqual([true]);
    });

    test('returns false when both services are unavailable', async () => {
      const core$ = new Subject<CoreStatus>();

      const availability = getElasticsearchAndSOAvailability(core$)
        .pipe(take(1), bufferCount(1))
        .toPromise();

      core$.next(mockCoreStatusAvailability({ elasticsearch: false, savedObjects: false }));

      expect(await availability).toEqual([false]);
    });

    test('returns false when one service is unavailable but the other is available', async () => {
      const core$ = new Subject<CoreStatus>();

      const availability = getElasticsearchAndSOAvailability(core$)
        .pipe(take(1), bufferCount(1))
        .toPromise();

      core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: false }));

      expect(await availability).toEqual([false]);
    });

    test('shift back and forth between values as status changes', async () => {
      const core$ = new Subject<CoreStatus>();

      const availability = getElasticsearchAndSOAvailability(core$)
        .pipe(take(3), bufferCount(3))
        .toPromise();

      core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: false }));

      core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: true }));

      core$.next(mockCoreStatusAvailability({ elasticsearch: false, savedObjects: false }));

      expect(await availability).toEqual([false, true, false]);
    });

    test(`skips values when the status hasn't changed`, async () => {
      const core$ = new Subject<CoreStatus>();

      const availability = getElasticsearchAndSOAvailability(core$)
        .pipe(take(3), bufferCount(3))
        .toPromise();

      core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: false }));

      // still false, so shouldn't emit a second time
      core$.next(mockCoreStatusAvailability({ elasticsearch: false, savedObjects: true }));

      core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: true }));

      // shouldn't emit as already true
      core$.next(mockCoreStatusAvailability({ elasticsearch: true, savedObjects: true }));

      core$.next(mockCoreStatusAvailability({ elasticsearch: false, savedObjects: false }));

      expect(await availability).toEqual([false, true, false]);
    });
  });
});

function mockCoreStatusAvailability({
  elasticsearch,
  savedObjects,
}: {
  elasticsearch: boolean;
  savedObjects: boolean;
}) {
  return {
    elasticsearch: {
      level: elasticsearch ? ServiceStatusLevels.available : ServiceStatusLevels.unavailable,
      summary: '',
    },
    savedObjects: {
      level: savedObjects ? ServiceStatusLevels.available : ServiceStatusLevels.unavailable,
      summary: '',
    },
  };
}
