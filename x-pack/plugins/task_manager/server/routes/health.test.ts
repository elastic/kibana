/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { healthRoute } from './health';
import { httpServiceMock } from 'src/core/server/mocks';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { TaskManagerConfig } from '../config';
import { of, Subject } from 'rxjs';
import { get } from 'lodash';
import { sleep } from '../test_utils';
import { AggregatedStat } from '../monitoring';

beforeEach(() => {
  jest.resetAllMocks();
});

const configuration: TaskManagerConfig = {
  enabled: true,
  max_workers: 10,
  index: 'foo',
  max_attempts: 9,
  poll_interval: 6000000,
  max_poll_inactivity_cycles: 10,
  request_capacity: 1000,
  monitored_aggregated_stats_refresh_rate: 5000,
};

describe('healthRoute', () => {
  it('registers the route', async () => {
    const router = httpServiceMock.createRouter();

    healthRoute(router, configuration, Promise.resolve(of()), 1000);

    const [config] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/task_manager/_health"`);
  });

  it('returns the initial config used to configure Task Manager', async () => {
    const router = httpServiceMock.createRouter();

    healthRoute(router, configuration, Promise.resolve(of()), 1000);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    expect(get(await handler(context, req, res), 'body.stats')).toMatchObject({
      configuration: {
        value: {
          max_workers: 10,
          poll_interval: 6000000,
          max_poll_inactivity_cycles: 10,
          request_capacity: 1000,
          monitored_aggregated_stats_refresh_rate: 5000,
        },
      },
    });
  });

  it('returns an error response if the stats are no longer fresh', async () => {
    const router = httpServiceMock.createRouter();

    healthRoute(router, configuration, Promise.resolve(of()), 1000);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    await sleep(2000);

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        attributes: {
          lastUpdate: expect.any(String),
          stats: {
            configuration: {
              timestamp: expect.any(String),
              value: {
                max_poll_inactivity_cycles: 10,
                max_workers: 10,
                poll_interval: 6000000,
                request_capacity: 1000,
                monitored_aggregated_stats_refresh_rate: 5000,
              },
            },
          },
        },
        message: new Error('Task Manager monitored stats are out of date'),
      },
    });
  });

  it('incrementally updates the stats returned by the endpoint', async () => {
    const router = httpServiceMock.createRouter();

    const aggregatedStats = Promise.resolve(new Subject<AggregatedStat>());

    healthRoute(router, configuration, Promise.resolve(aggregatedStats), 1000);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok', 'internalError']);

    return aggregatedStats.then(async (aggregatedStats$) => {
      aggregatedStats$.next({
        key: 'newAggregatedStat',
        value: {
          some: {
            complex: {
              value: 123,
            },
          },
        },
      });

      expect(await handler(context, req, res)).toMatchObject({
        body: {
          lastUpdate: expect.any(String),
          stats: {
            newAggregatedStat: {
              timestamp: expect.any(String),
              value: {
                some: {
                  complex: {
                    value: 123,
                  },
                },
              },
            },
            configuration: {
              timestamp: expect.any(String),
              value: {
                max_workers: 10,
                poll_interval: 6000000,
                max_poll_inactivity_cycles: 10,
                request_capacity: 1000,
                monitored_aggregated_stats_refresh_rate: 5000,
              },
            },
          },
        },
      });

      aggregatedStats$.next({
        key: 'newAggregatedStat',
        value: {
          some: {
            updated: {
              value: 456,
            },
          },
        },
      });

      expect(await handler(context, req, res)).toMatchObject({
        body: {
          lastUpdate: expect.any(String),
          stats: {
            newAggregatedStat: {
              timestamp: expect.any(String),
              value: {
                some: {
                  updated: {
                    value: 456,
                  },
                },
              },
            },
            configuration: {
              timestamp: expect.any(String),
              value: {
                max_workers: 10,
                poll_interval: 6000000,
                max_poll_inactivity_cycles: 10,
                request_capacity: 1000,
                monitored_aggregated_stats_refresh_rate: 5000,
              },
            },
          },
        },
      });
    });
  });
});
