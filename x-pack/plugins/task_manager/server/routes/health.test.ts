/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, of, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { merge } from 'lodash';
import uuid from 'uuid';
import { httpServiceMock } from 'src/core/server/mocks';
import { healthRoute } from './health';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { sleep } from '../test_utils';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import { Logger } from '../../../../../src/core/server';
import { MonitoringStats, summarizeMonitoringStats } from '../monitoring';
import { ServiceStatusLevels } from 'src/core/server';
import { configSchema, TaskManagerConfig } from '../config';

describe('healthRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('registers the route', async () => {
    const router = httpServiceMock.createRouter();

    const logger = loggingSystemMock.create().get();
    healthRoute(router, of(), logger, uuid.v4(), getTaskManagerConfig());

    const [config] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/task_manager/_health"`);
  });

  it('logs the Task Manager stats at a fixed interval', async () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.create().get();

    const mockStat = mockHealthStats();
    await sleep(10);
    const skippedMockStat = mockHealthStats();
    await sleep(10);
    const nextMockStat = mockHealthStats();

    const stats$ = new Subject<MonitoringStats>();

    const id = uuid.v4();
    healthRoute(
      router,
      stats$,
      logger,
      id,
      getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_aggregated_stats_refresh_rate: 60000,
      })
    );

    stats$.next(mockStat);
    await sleep(500);
    stats$.next(skippedMockStat);
    await sleep(600);
    stats$.next(nextMockStat);

    const firstDebug = JSON.parse(
      (logger as jest.Mocked<Logger>).debug.mock.calls[0][0].replace('Latest Monitored Stats: ', '')
    );
    expect(firstDebug).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(mockStat, getTaskManagerConfig({})),
    });

    const secondDebug = JSON.parse(
      (logger as jest.Mocked<Logger>).debug.mock.calls[1][0].replace('Latest Monitored Stats: ', '')
    );
    expect(secondDebug).not.toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(skippedMockStat, getTaskManagerConfig({})),
    });
    expect(secondDebug).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(nextMockStat, getTaskManagerConfig({})),
    });

    expect(logger.debug).toHaveBeenCalledTimes(2);
  });

  it('returns a error status if the overall stats have not been updated within the required hot freshness', async () => {
    const router = httpServiceMock.createRouter();

    const stats$ = new Subject<MonitoringStats>();

    const serviceStatus$ = healthRoute(
      router,
      stats$,
      loggingSystemMock.create().get(),
      uuid.v4(),
      getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_aggregated_stats_refresh_rate: 60000,
      })
    );

    const serviceStatus = getLatest(serviceStatus$);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    await sleep(0);

    stats$.next(
      mockHealthStats({
        last_update: new Date(Date.now() - 1500).toISOString(),
      })
    );

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...summarizeMonitoringStats(
          mockHealthStats({
            last_update: expect.any(String),
            stats: {
              configuration: {
                timestamp: expect.any(String),
              },
              workload: {
                timestamp: expect.any(String),
              },
              runtime: {
                timestamp: expect.any(String),
                value: {
                  polling: {
                    last_successful_poll: expect.any(String),
                  },
                },
              },
            },
          }),
          getTaskManagerConfig({})
        ),
      },
    });

    expect(await serviceStatus).toMatchObject({
      level: ServiceStatusLevels.unavailable,
      summary: 'Task Manager is unavailable',
      meta: {
        status: 'error',
        ...summarizeMonitoringStats(
          mockHealthStats({
            last_update: expect.any(String),
            stats: {
              configuration: {
                timestamp: expect.any(String),
              },
              workload: {
                timestamp: expect.any(String),
              },
              runtime: {
                timestamp: expect.any(String),
                value: {
                  polling: {
                    last_successful_poll: expect.any(String),
                  },
                },
              },
            },
          }),
          getTaskManagerConfig({})
        ),
      },
    });
  });

  it('returns a error status if the workload stats have not been updated within the required cold freshness', async () => {
    const router = httpServiceMock.createRouter();

    const stats$ = new Subject<MonitoringStats>();

    healthRoute(
      router,
      stats$,
      loggingSystemMock.create().get(),
      uuid.v4(),
      getTaskManagerConfig({
        monitored_stats_required_freshness: 5000,
        monitored_aggregated_stats_refresh_rate: 60000,
      })
    );

    await sleep(0);

    const lastUpdateOfWorkload = new Date(Date.now() - 120000).toISOString();
    stats$.next(
      mockHealthStats({
        stats: {
          workload: {
            timestamp: lastUpdateOfWorkload,
          },
        },
      })
    );

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    await sleep(2000);

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...summarizeMonitoringStats(
          mockHealthStats({
            last_update: expect.any(String),
            stats: {
              configuration: {
                timestamp: expect.any(String),
              },
              workload: {
                timestamp: expect.any(String),
              },
              runtime: {
                timestamp: expect.any(String),
                value: {
                  polling: {
                    last_successful_poll: expect.any(String),
                  },
                },
              },
            },
          }),
          getTaskManagerConfig()
        ),
      },
    });
  });

  it('returns a error status if the poller hasnt polled within the required hot freshness', async () => {
    const router = httpServiceMock.createRouter();

    const stats$ = new Subject<MonitoringStats>();
    healthRoute(
      router,
      stats$,
      loggingSystemMock.create().get(),
      uuid.v4(),
      getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_aggregated_stats_refresh_rate: 60000,
      })
    );

    await sleep(0);

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const last_successful_poll = new Date(Date.now() - 2000).toISOString();
    stats$.next(
      mockHealthStats({
        stats: {
          runtime: {
            value: {
              polling: {
                last_successful_poll,
              },
            },
          },
        },
      })
    );

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...summarizeMonitoringStats(
          mockHealthStats({
            last_update: expect.any(String),
            stats: {
              configuration: {
                timestamp: expect.any(String),
              },
              workload: {
                timestamp: expect.any(String),
              },
              runtime: {
                timestamp: expect.any(String),
                value: {
                  polling: {
                    last_successful_poll,
                  },
                },
              },
            },
          }),
          getTaskManagerConfig()
        ),
      },
    });
  });
});

function mockHealthStats(overrides = {}) {
  return (merge(
    {
      last_update: new Date().toISOString(),
      stats: {
        configuration: {
          timestamp: new Date().toISOString(),
          value: {
            value: {
              max_workers: 10,
              poll_interval: 6000000,
              max_poll_inactivity_cycles: 10,
              request_capacity: 1000,
              monitored_aggregated_stats_refresh_rate: 5000,
              monitored_stats_running_average_window: 50,
              monitored_task_execution_thresholds: {
                default: {
                  error_threshold: 90,
                  warn_threshold: 80,
                },
                custom: {},
              },
            },
          },
        },
        workload: {
          timestamp: new Date().toISOString(),
          value: {
            count: 4,
            taskTypes: {
              actions_telemetry: { count: 2, status: { idle: 2 } },
              alerting_telemetry: { count: 1, status: { idle: 1 } },
              session_cleanup: { count: 1, status: { idle: 1 } },
            },
            schedule: {},
            overdue: 0,
            estimatedScheduleDensity: [],
          },
        },
        runtime: {
          timestamp: new Date().toISOString(),
          value: {
            drift: [1000, 60000],
            load: [0, 100, 75],
            execution: {
              duration: [],
              result_frequency_percent_as_number: [],
            },
            polling: {
              last_successful_poll: new Date().toISOString(),
              duration: [500, 400, 3000],
              claim_conflicts: [0, 100, 75],
              claim_mismatches: [0, 100, 75],
              result_frequency_percent_as_number: [
                'NoTasksClaimed',
                'NoTasksClaimed',
                'NoTasksClaimed',
              ],
            },
          },
        },
      },
    },
    overrides
  ) as unknown) as MonitoringStats;
}

async function getLatest<T>(stream$: Observable<T>) {
  return new Promise<T>((resolve) => stream$.pipe(take(1)).subscribe((stats) => resolve(stats)));
}

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
