/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import {
  HealthStatus,
  MonitoringStats,
  RawMonitoringStats,
  summarizeMonitoringStats,
} from '../monitoring';
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
        monitored_stats_warn_drift_in_seconds: 100,
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
      ...ignoreCapacityEstimation(summarizeMonitoringStats(mockStat, getTaskManagerConfig({}))),
    });

    const firstError = JSON.parse(
      ((logger as jest.Mocked<Logger>).error.mock.calls[0][0] as string).replace(
        'Latest Monitored Stats (error status): ',
        ''
      )
    );
    expect(firstError).not.toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...ignoreCapacityEstimation(
        summarizeMonitoringStats(skippedMockStat, getTaskManagerConfig({}))
      ),
    });
    expect(firstError).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...ignoreCapacityEstimation(summarizeMonitoringStats(nextMockStat, getTaskManagerConfig({}))),
    });

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it(`logs at a warn level if the status is warning`, async () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.create().get();

    const warnRuntimeStat = mockHealthStats({
      stats: {
        runtime: {
          customStatus: HealthStatus.Warning,
        },
      },
    });
    const oneSecondFromNow = Date.now() + 1000;
    const warnConfigurationStat = mockHealthStats({
      last_update: new Date(oneSecondFromNow).toISOString(),
      stats: {
        configuration: {
          customStatus: HealthStatus.Warning,
        },
        runtime: {
          value: {
            polling: {
              last_successful_poll: new Date(oneSecondFromNow).toISOString(),
            },
          },
        },
      },
    });
    const twoSecondsFromNow = Date.now() + 2000;
    const warnWorkloadStat = mockHealthStats({
      last_update: new Date(twoSecondsFromNow).toISOString(),
      stats: {
        workload: {
          customStatus: HealthStatus.Warning,
        },
        runtime: {
          value: {
            polling: {
              last_successful_poll: new Date(twoSecondsFromNow).toISOString(),
            },
          },
        },
      },
    });

    const stats$ = new Subject<MonitoringStats>();

    const id = uuid.v4();
    healthRoute(
      router,
      stats$,
      logger,
      id,
      getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_stats_warn_drift_in_seconds: 120,
        monitored_aggregated_stats_refresh_rate: 60000,
      })
    );

    stats$.next(warnRuntimeStat);
    await sleep(1001);
    stats$.next(warnConfigurationStat);
    await sleep(1001);
    stats$.next(warnWorkloadStat);

    const warnRuntimeLog = JSON.parse(
      ((logger as jest.Mocked<Logger>).warn.mock.calls[0][0] as string).replace(
        'Latest Monitored Stats (warning status): ',
        ''
      )
    );
    expect(warnRuntimeLog).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(warnRuntimeStat, getTaskManagerConfig({})),
    });

    const warnConfigurationLog = JSON.parse(
      ((logger as jest.Mocked<Logger>).warn.mock.calls[1][0] as string).replace(
        'Latest Monitored Stats (warning status): ',
        ''
      )
    );
    expect(warnConfigurationLog).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(warnConfigurationStat, getTaskManagerConfig({})),
    });

    const warnWorkloadLog = JSON.parse(
      ((logger as jest.Mocked<Logger>).warn.mock.calls[2][0] as string).replace(
        'Latest Monitored Stats (warning status): ',
        ''
      )
    );
    expect(warnWorkloadLog).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(warnWorkloadStat, getTaskManagerConfig({})),
    });

    expect(logger.warn).toHaveBeenCalledTimes(3);
  });

  it(`logs at an error level if the status is error`, async () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.create().get();

    const errorRuntimeStat = mockHealthStats({
      stats: {
        runtime: {
          customStatus: HealthStatus.Error,
        },
      },
    });
    const errorConfigurationStat = mockHealthStats({
      stats: {
        configuration: {
          customStatus: HealthStatus.Error,
        },
      },
    });
    const errorWorkloadStat = mockHealthStats({
      stats: {
        workload: {
          customStatus: HealthStatus.Error,
        },
      },
    });

    const stats$ = new Subject<MonitoringStats>();

    const id = uuid.v4();
    healthRoute(
      router,
      stats$,
      logger,
      id,
      getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_stats_warn_drift_in_seconds: 120,
        monitored_aggregated_stats_refresh_rate: 60000,
      })
    );

    stats$.next(errorRuntimeStat);
    await sleep(1001);
    stats$.next(errorConfigurationStat);
    await sleep(1001);
    stats$.next(errorWorkloadStat);

    const errorRuntimeLog = JSON.parse(
      ((logger as jest.Mocked<Logger>).error.mock.calls[0][0] as string).replace(
        'Latest Monitored Stats (error status): ',
        ''
      )
    );
    expect(errorRuntimeLog).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(errorRuntimeStat, getTaskManagerConfig({})),
    });

    const errorConfigurationLog = JSON.parse(
      ((logger as jest.Mocked<Logger>).error.mock.calls[1][0] as string).replace(
        'Latest Monitored Stats (error status): ',
        ''
      )
    );
    expect(errorConfigurationLog).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(errorConfigurationStat, getTaskManagerConfig({})),
    });

    const errorWorkloadLog = JSON.parse(
      ((logger as jest.Mocked<Logger>).error.mock.calls[2][0] as string).replace(
        'Latest Monitored Stats (error status): ',
        ''
      )
    );
    expect(errorWorkloadLog).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(errorWorkloadStat, getTaskManagerConfig({})),
    });

    expect(logger.error).toHaveBeenCalledTimes(3);
  });

  it(`logs at a warn level if the drift is over configured value`, async () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.create().get();

    const stat = mockHealthStats({
      stats: {
        runtime: {
          value: {
            drift: [1, 2, 3, 10000],
          },
        },
      },
    });
    const nonWarnStat = mockHealthStats({
      last_update: new Date(Date.now() + 1000).toISOString(),
      stats: {
        runtime: {
          value: {
            drift: [1, 2, 3, 9999],
            polling: {
              last_successful_poll: new Date(Date.now() + 1000).toISOString(),
            },
          },
        },
      },
    });

    const stats$ = new Subject<MonitoringStats>();

    const id = uuid.v4();
    healthRoute(
      router,
      stats$,
      logger,
      id,
      getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_stats_warn_drift_in_seconds: 10,
        monitored_aggregated_stats_refresh_rate: 60000,
      })
    );

    stats$.next(stat);
    await sleep(1001);
    stats$.next(nonWarnStat);

    const warnLog = JSON.parse(
      ((logger as jest.Mocked<Logger>).warn.mock.calls[0][0] as string).replace(
        'Latest Monitored Stats (Detected drift of 10s): ',
        ''
      )
    );
    expect(warnLog).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(stat, getTaskManagerConfig({})),
    });

    const debugLog = JSON.parse(
      ((logger as jest.Mocked<Logger>).debug.mock.calls[0][0] as string).replace(
        'Latest Monitored Stats: ',
        ''
      )
    );
    expect(debugLog).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(nonWarnStat, getTaskManagerConfig({})),
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(1);
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

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    await sleep(0);

    stats$.next(
      mockHealthStats({
        last_update: new Date(Date.now() - 1500).toISOString(),
      })
    );

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...ignoreCapacityEstimation(
          summarizeMonitoringStats(
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
          )
        ),
      },
    });

    expect(await serviceStatus).toMatchObject({
      level: ServiceStatusLevels.unavailable,
      summary: 'Task Manager is unavailable',
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

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    await sleep(2000);

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...ignoreCapacityEstimation(
          summarizeMonitoringStats(
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
          )
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

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...ignoreCapacityEstimation(
          summarizeMonitoringStats(
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
          )
        ),
      },
    });
  });
});

function ignoreCapacityEstimation(stats: RawMonitoringStats) {
  stats.stats.capacity_estimation = expect.any(Object);
  return stats;
}

function mockHealthStats(overrides = {}) {
  const stub: MonitoringStats = {
    last_update: new Date().toISOString(),
    stats: {
      configuration: {
        timestamp: new Date().toISOString(),
        value: {
          max_workers: 10,
          poll_interval: 3000,
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
      workload: {
        timestamp: new Date().toISOString(),
        value: {
          count: 4,
          task_types: {
            actions_telemetry: { count: 2, status: { idle: 2 } },
            alerting_telemetry: { count: 1, status: { idle: 1 } },
            session_cleanup: { count: 1, status: { idle: 1 } },
          },
          schedule: [],
          overdue: 0,
          overdue_non_recurring: 0,
          estimatedScheduleDensity: [],
          non_recurring: 20,
          owner_ids: [0, 0, 0, 1, 2, 0, 0, 2, 2, 2, 1, 2, 1, 1],
          estimated_schedule_density: [],
          capacity_requirments: {
            per_minute: 150,
            per_hour: 360,
            per_day: 820,
          },
        },
      },
      runtime: {
        timestamp: new Date().toISOString(),
        value: {
          drift: [1000, 60000],
          drift_by_type: {},
          load: [0, 100, 75],
          execution: {
            duration: {},
            duration_by_persistence: {},
            persistence: [],
            result_frequency_percent_as_number: {},
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
  };
  return (merge(stub, overrides) as unknown) as MonitoringStats;
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
