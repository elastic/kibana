/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { sleep } from '../test_utils';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { MonitoringStats } from '../monitoring';
import { configSchema, TaskManagerConfig } from '../config';
import { backgroundTaskUtilizationRoute } from './background_task_utilization';
import { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

const createMockClusterClient = (response: SecurityHasPrivilegesResponse) => {
  const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResponse(response);

  const mockClusterClient = elasticsearchServiceMock.createClusterClient();
  mockClusterClient.asScoped.mockReturnValue(mockScopedClusterClient);

  return { mockClusterClient, mockScopedClusterClient };
};

describe('backgroundTaskUtilizationRoute', () => {
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('registers internal and public route', async () => {
    const router = httpServiceMock.createRouter();
    backgroundTaskUtilizationRoute({
      router,
      monitoringStats$: of(),
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig(),
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
    });

    const [config1] = router.get.mock.calls[0];

    expect(config1.path).toMatchInlineSnapshot(
      `"/internal/task_manager/_background_task_utilization"`
    );
    expect(config1.options?.authRequired).toEqual(true);

    const [config2] = router.get.mock.calls[1];

    expect(config2.path).toMatchInlineSnapshot(`"/api/task_manager/_background_task_utilization"`);
    expect(config2.options?.authRequired).toEqual(true);
  });

  it(`sets "authRequired" to false when config.unsafe.authenticate_background_task_utilization is set to false`, async () => {
    const router = httpServiceMock.createRouter();
    backgroundTaskUtilizationRoute({
      router,
      monitoringStats$: of(),
      logger,
      taskManagerId: uuidv4(),
      config: {
        ...getTaskManagerConfig(),
        unsafe: { exclude_task_types: [], authenticate_background_task_utilization: false },
      },
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
    });

    const [config1] = router.get.mock.calls[0];

    expect(config1.path).toMatchInlineSnapshot(
      `"/internal/task_manager/_background_task_utilization"`
    );
    expect(config1.options?.authRequired).toEqual(true);

    const [config2] = router.get.mock.calls[1];

    expect(config2.path).toMatchInlineSnapshot(`"/api/task_manager/_background_task_utilization"`);
    expect(config2.options?.authRequired).toEqual(false);
  });

  it('checks user privileges and increments usage counter when API is accessed', async () => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({
      has_all_requested: false,
    } as SecurityHasPrivilegesResponse);
    const router = httpServiceMock.createRouter();
    backgroundTaskUtilizationRoute({
      router,
      monitoringStats$: of(),
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig(),
      kibanaVersion: '8.0',
      kibanaIndexName: 'foo',
      getClusterClient: () => Promise.resolve(mockClusterClient),
      usageCounter: mockUsageCounter,
    });

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);
    await handler(context, req, res);

    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      body: {
        application: [
          {
            application: `kibana-foo`,
            resources: ['*'],
            privileges: [`api:8.0:taskManager`],
          },
        ],
      },
    });
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(mockUsageCounter.incrementCounter).toHaveBeenNthCalledWith(1, {
      counterName: `taskManagerBackgroundTaskUtilApiAccess`,
      counterType: 'taskManagerBackgroundTaskUtilApi',
      incrementBy: 1,
    });
  });

  it('checks user privileges and increments admin usage counter when API is accessed when user has access to task manager feature', async () => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({
      has_all_requested: true,
    } as SecurityHasPrivilegesResponse);
    const router = httpServiceMock.createRouter();
    backgroundTaskUtilizationRoute({
      router,
      monitoringStats$: of(),
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig(),
      kibanaVersion: '8.0',
      kibanaIndexName: 'foo',
      getClusterClient: () => Promise.resolve(mockClusterClient),
      usageCounter: mockUsageCounter,
    });

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);
    await handler(context, req, res);

    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      body: {
        application: [
          {
            application: `kibana-foo`,
            resources: ['*'],
            privileges: [`api:8.0:taskManager`],
          },
        ],
      },
    });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(2);
    expect(mockUsageCounter.incrementCounter).toHaveBeenNthCalledWith(1, {
      counterName: `taskManagerBackgroundTaskUtilApiAccess`,
      counterType: 'taskManagerBackgroundTaskUtilApi',
      incrementBy: 1,
    });
    expect(mockUsageCounter.incrementCounter).toHaveBeenNthCalledWith(2, {
      counterName: `taskManagerBackgroundTaskUtilApiAdminAccess`,
      counterType: 'taskManagerBackgroundTaskUtilApi',
      incrementBy: 1,
    });
  });

  it('skips checking user privileges if usage counter is undefined', async () => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({
      has_all_requested: false,
    } as SecurityHasPrivilegesResponse);
    const router = httpServiceMock.createRouter();
    backgroundTaskUtilizationRoute({
      router,
      monitoringStats$: of(),
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig(),
      kibanaVersion: '8.0',
      kibanaIndexName: 'foo',
      getClusterClient: () => Promise.resolve(mockClusterClient),
    });

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);
    await handler(context, req, res);

    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).not.toHaveBeenCalled();
  });

  it(`skips checking user privileges for public API if config.unsafe.authenticate_background_task_utilization is set to false`, async () => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({
      has_all_requested: false,
    } as SecurityHasPrivilegesResponse);
    const router = httpServiceMock.createRouter();
    backgroundTaskUtilizationRoute({
      router,
      monitoringStats$: of(),
      logger,
      taskManagerId: uuidv4(),
      config: {
        ...getTaskManagerConfig(),
        unsafe: { exclude_task_types: [], authenticate_background_task_utilization: false },
      },
      kibanaVersion: '8.0',
      kibanaIndexName: 'foo',
      getClusterClient: () => Promise.resolve(mockClusterClient),
      usageCounter: mockUsageCounter,
    });

    const [, handler] = router.get.mock.calls[1];
    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);
    await handler(context, req, res);

    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).not.toHaveBeenCalled();
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  it(`logs an error if the utilization stats are null`, async () => {
    const router = httpServiceMock.createRouter();
    const stats$ = new Subject<MonitoringStats>();
    const id = uuidv4();
    backgroundTaskUtilizationRoute({
      router,
      monitoringStats$: stats$,
      logger,
      taskManagerId: id,
      config: getTaskManagerConfig(),
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
    });

    stats$.next({ stats: {} } as MonitoringStats);
    await sleep(1001);

    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      'Unable to get Task Manager background task utilization metrics.'
    );
  });
});

const getTaskManagerConfig = (overrides: Partial<TaskManagerConfig> = {}) =>
  configSchema.validate(
    overrides.monitored_stats_required_freshness
      ? {
          // use `monitored_stats_required_freshness` as poll interval otherwise we might
          // fail validation as it must be greather than the poll interval
          poll_interval: overrides.monitored_stats_required_freshness,
          ...overrides,
        }
      : overrides
  );
