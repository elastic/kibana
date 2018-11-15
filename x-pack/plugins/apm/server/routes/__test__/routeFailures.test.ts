/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
// @ts-ignore
import { initErrorsApi } from '../errors';
import { initServicesApi } from '../services';
// @ts-ignore
import { initStatusApi } from '../status_check';
import { initTracesApi } from '../traces';
import { initTransactionsApi } from '../transactions';

describe('route handlers fail properly', () => {
  let consoleErrorSpy: any;

  async function testRouteFailures(init: (server: Server) => void) {
    const mockServer = { route: jest.fn() };
    init((mockServer as unknown) as Server);
    expect(mockServer.route).toHaveBeenCalled();

    const routes = mockServer.route.mock.calls;
    const mockReq = {
      params: {},
      query: {},
      pre: {
        setup: {
          config: { get: jest.fn() },
          client: jest.fn(() => Promise.reject(new Error('request failed')))
        }
      }
    };

    routes.forEach(async (route, i) => {
      test(`route ${i + 1} of ${
        routes.length
      } should fail with a Boom error`, async () => {
        await expect(route[0].handler(mockReq)).rejects.toMatchObject({
          message: 'request failed',
          isBoom: true
        });
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      });
    });
  }

  beforeEach(() => {
    consoleErrorSpy = jest
      .spyOn(global.console, 'error')
      .mockImplementation(undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('error routes', async () => {
    await testRouteFailures(initErrorsApi);
  });

  describe('service routes', async () => {
    await testRouteFailures(initServicesApi);
  });

  describe('status check routes', async () => {
    await testRouteFailures(initStatusApi);
  });

  describe('trace routes', async () => {
    await testRouteFailures(initTracesApi);
  });

  describe('transaction routes', async () => {
    await testRouteFailures(initTransactionsApi);
  });
});
