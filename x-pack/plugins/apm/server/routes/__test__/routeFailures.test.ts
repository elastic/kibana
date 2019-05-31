/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { InternalCoreSetup } from 'src/core/server';
import { initErrorsApi } from '../errors';
import { initServicesApi } from '../services';
import { initTracesApi } from '../traces';

describe('route handlers should fail with a Boom error', () => {
  let consoleErrorSpy: any;

  async function testRouteFailures(init: (core: InternalCoreSetup) => void) {
    const mockServer = { route: jest.fn() };
    const mockCore = ({
      http: {
        server: mockServer
      }
    } as unknown) as InternalCoreSetup;
    init(mockCore);
    expect(mockServer.route).toHaveBeenCalled();

    const mockCluster = {
      callWithRequest: () => Promise.reject(new Error('request failed'))
    };
    const mockConfig = { get: jest.fn() };
    const mockReq = {
      params: {},
      query: {},
      server: {
        config: () => mockConfig,
        plugins: {
          elasticsearch: {
            getCluster: () => mockCluster
          }
        }
      },
      getUiSettingsService: jest.fn(() => ({
        get: jest.fn()
      }))
    };

    const routes = flatten(mockServer.route.mock.calls);
    routes.forEach(async (route, i) => {
      test(`${route.method} ${route.path}"`, async () => {
        await expect(route.handler(mockReq)).rejects.toMatchObject({
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

  describe('trace routes', async () => {
    await testRouteFailures(initTracesApi);
  });
});
