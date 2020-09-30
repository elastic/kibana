/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of, Subject } from 'rxjs';
import { merge } from 'lodash';
import { httpServiceMock } from 'src/core/server/mocks';
import { healthRoute } from './health';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { sleep, mockLogger } from '../test_utils';
import { MonitoringStats, summarizeMonitoringStats } from '../monitoring';

describe('healthRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('registers the route', async () => {
    const router = httpServiceMock.createRouter();

    healthRoute(router, Promise.resolve(of()), mockLogger(), 1000);

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

    healthRoute(router, stats, logger, 1000);

    const stats$ = await stats;

    stats$.next(mockStat);
    await sleep(500);
    stats$.next(skippedMockStat);
    await sleep(600);
    stats$.next(nextMockStat);

    expect(logger.debug).toHaveBeenCalledWith(JSON.stringify(summarizeMonitoringStats(mockStat)));
    expect(logger.debug).not.toHaveBeenCalledWith(
      JSON.stringify(summarizeMonitoringStats(skippedMockStat))
    );
    expect(logger.debug).toHaveBeenCalledWith(
      JSON.stringify(summarizeMonitoringStats(nextMockStat))
    );
    expect(logger.debug).toHaveBeenCalledTimes(2);
  });

  it('returns an error response if the stats are no longer fresh', async () => {
    const router = httpServiceMock.createRouter();

    const mockStat = mockHealthStats();
    healthRoute(router, Promise.resolve(of(mockStat)), mockLogger(), 1000);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    await sleep(2000);

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        attributes: summarizeMonitoringStats(
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
        message: new Error('Task Manager monitored stats are out of date'),
      },
    });
  });

  it('returns an error response if the poller hasnt polled within the required freshness', async () => {
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
    healthRoute(router, Promise.resolve(of(mockStat)), mockLogger(), 1000);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        attributes: summarizeMonitoringStats(
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
        message: new Error('Task Manager monitored stats are out of date'),
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
            sum: 4,
            taskTypes: {
              actions_telemetry: { sum: 2, status: { idle: 2 } },
              alerting_telemetry: { sum: 1, status: { idle: 1 } },
              session_cleanup: { sum: 1, status: { idle: 1 } },
            },
          },
        },
        runtime: {
          timestamp: new Date().toISOString(),
          value: {
            drift: [1000, 1000],
            duration: [],
            taskRunResultFrequency: [],
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
