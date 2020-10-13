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
import { sleep, mockLogger } from '../test_utils';
import { MonitoringStats, summarizeMonitoringStats } from '../monitoring';
import { ServiceStatusLevels } from 'src/core/server';

describe('healthRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('registers the route', async () => {
    const router = httpServiceMock.createRouter();

    healthRoute(router, Promise.resolve(of()), mockLogger(), uuid.v4(), 1000, 1000);

    const [config] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/task_manager/_health"`);
  });

  it('logs the Task Manager stats at a fixed interval', async () => {
    const router = httpServiceMock.createRouter();
    const logger = mockLogger();

    const mockStat = mockHealthStats();
    await sleep(10);
    const skippedMockStat = mockHealthStats();
    await sleep(10);
    const nextMockStat = mockHealthStats();

    const stats = Promise.resolve(new Subject<MonitoringStats>());

    const id = uuid.v4();
    healthRoute(router, stats, logger, id, 1000, 60000);

    const stats$ = await stats;

    stats$.next(mockStat);
    await sleep(500);
    stats$.next(skippedMockStat);
    await sleep(600);
    stats$.next(nextMockStat);

    const firstDebug = JSON.parse(logger.debug.mock.calls[0][0]);
    expect(firstDebug).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(mockStat),
    });

    const secondDebug = JSON.parse(logger.debug.mock.calls[1][0]);
    expect(secondDebug).not.toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(skippedMockStat),
    });
    expect(secondDebug).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...summarizeMonitoringStats(nextMockStat),
    });

    expect(logger.debug).toHaveBeenCalledTimes(2);
  });

  it('returns a error status if the overall stats have not been updated within the required hot freshness', async () => {
    const router = httpServiceMock.createRouter();

    const mockStat = mockHealthStats({
      lastUpdate: new Date(Date.now() - 1500).toISOString(),
    });

    const serviceStatus$ = healthRoute(
      router,
      Promise.resolve(of(mockStat)),
      mockLogger(),
      uuid.v4(),
      1000,
      60000
    );

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    await sleep(2000);

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...summarizeMonitoringStats(
          mockHealthStats({
            lastUpdate: expect.any(String),
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
                    lastSuccessfulPoll: expect.any(String),
                  },
                },
              },
            },
          })
        ),
      },
    });

    expect(await getLatest(serviceStatus$)).toMatchObject({
      level: ServiceStatusLevels.unavailable,
      summary: 'Task Manager is unavailable',
      meta: {
        status: 'error',
        ...summarizeMonitoringStats(
          mockHealthStats({
            lastUpdate: expect.any(String),
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
                    lastSuccessfulPoll: expect.any(String),
                  },
                },
              },
            },
          })
        ),
      },
    });
  });

  it('returns a error status if the workload stats have not been updated within the required cold freshness', async () => {
    const router = httpServiceMock.createRouter();

    const lastUpdateOfWorkload = new Date(Date.now() - 120000).toISOString();
    const mockStat = mockHealthStats({
      stats: {
        workload: {
          timestamp: lastUpdateOfWorkload,
        },
      },
    });
    healthRoute(router, Promise.resolve(of(mockStat)), mockLogger(), uuid.v4(), 5000, 60000);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    await sleep(2000);

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...summarizeMonitoringStats(
          mockHealthStats({
            lastUpdate: expect.any(String),
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
                    lastSuccessfulPoll: expect.any(String),
                  },
                },
              },
            },
          })
        ),
      },
    });
  });

  it('returns a error status if the poller hasnt polled within the required hot freshness', async () => {
    const router = httpServiceMock.createRouter();

    const lastSuccessfulPoll = new Date(Date.now() - 2000).toISOString();
    const mockStat = mockHealthStats({
      stats: {
        runtime: {
          value: {
            polling: {
              lastSuccessfulPoll,
            },
          },
        },
      },
    });
    healthRoute(router, Promise.resolve(of(mockStat)), mockLogger(), uuid.v4(), 1000, 60000);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...summarizeMonitoringStats(
          mockHealthStats({
            lastUpdate: expect.any(String),
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
                    lastSuccessfulPoll,
                  },
                },
              },
            },
          })
        ),
      },
    });
  });
});

function mockHealthStats(overrides = {}) {
  return (merge(
    {
      lastUpdate: new Date().toISOString(),
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
            execution: {
              duration: [],
              resultFrequency: [],
            },
            polling: {
              lastSuccessfulPoll: new Date().toISOString(),
              resultFrequency: ['NoTasksClaimed', 'NoTasksClaimed', 'NoTasksClaimed'],
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
