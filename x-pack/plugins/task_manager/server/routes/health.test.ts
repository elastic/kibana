/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { healthRoute } from './health';
import { httpServiceMock } from 'src/core/server/mocks';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { of } from 'rxjs';
import { sleep, mockLogger } from '../test_utils';

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

    healthRoute(router, Promise.resolve(of()), logger, 1000);

    await sleep(1000);

    expect(logger.debug).toHaveBeenCalledWith('');
  });

  it('returns an error response if the stats are no longer fresh', async () => {
    const router = httpServiceMock.createRouter();

    healthRoute(router, Promise.resolve(of()), mockLogger(), 1000);

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
                monitored_stats_running_average_window: 50,
              },
            },
          },
        },
        message: new Error('Task Manager monitored stats are out of date'),
      },
    });
  });
});
