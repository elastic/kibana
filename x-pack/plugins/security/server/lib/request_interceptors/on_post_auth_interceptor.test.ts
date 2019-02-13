/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn(() => ({ callWithRequest: jest.fn(), callWithInternalUser: jest.fn() })),
}));

import { Server } from 'hapi';
import sinon from 'sinon';

import { XPackFeature } from 'x-pack/plugins/xpack_main/server/lib/xpack_info';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { XPackMainPlugin } from 'x-pack/plugins/xpack_main/xpack_main';
import { createAuthorizationService } from '../authorization';
import { initSecurityOnPostAuthRequestInterceptor } from './on_post_auth_interceptor';

interface TestOptions {
  hasAllRequested?: boolean;
  useRbac?: boolean;
}

describe('onPostAuthRequestInterceptor', () => {
  const sandbox = sinon.sandbox.create();
  const teardowns: Array<() => void> = [];
  const headers = {
    authorization: 'foo',
  };
  let server: any;
  let request: any;

  const serverBasePath = '/';
  const defaultRoute = '/app/custom-app';

  beforeEach(() => {
    teardowns.push(() => sandbox.restore());
    request = async (
      path: string,
      { hasAllRequested = true, useRbac = true }: TestOptions = {}
    ) => {
      server = new Server();

      interface Config {
        [key: string]: any;
      }
      const config: Config = {
        'server.basePath': serverBasePath,
        'server.defaultRoute': defaultRoute,
      };

      server.decorate(
        'server',
        'config',
        jest.fn(() => {
          return {
            get: jest.fn(key => {
              return config[key];
            }),
          };
        })
      );

      const xpackMainPlugin = {
        getFeatures: () =>
          [
            {
              id: 'feature-1',
              name: 'feature 1',
              app: ['app-1'],
            },
            {
              id: 'feature-2',
              name: 'feature 2',
              app: ['app-2'],
            },
            {
              id: 'feature-4',
              name: 'feature 4',
              app: ['app-1', 'app-4'],
            },
          ] as Feature[],
      };

      const xpackMainFeature: XPackFeature = {
        isAvailable: () => true,
        isEnabled: () => true,
        getLicenseCheckResults: () => ({}),
        registerLicenseCheckResultsGenerator: () => null,
      };

      const spacesPlugin = null;

      const authorizationService = createAuthorizationService(
        server,
        xpackMainFeature,
        xpackMainPlugin as XPackMainPlugin,
        spacesPlugin
      );

      authorizationService.mode.useRbac = () => useRbac;

      // Mock authC
      authorizationService.checkPrivilegesDynamicallyWithRequest = () => {
        return () =>
          Promise.resolve({
            hasAllRequested,
            username: '',
            privileges: {},
          });
      };

      server.plugins = {
        security: {
          authorization: authorizationService,
        },
        xpack_main: xpackMainPlugin,
      };

      let basePath: string | undefined;
      server.decorate('request', 'getBasePath', () => basePath);
      server.decorate('request', 'setBasePath', (newPath: string) => {
        basePath = newPath;
      });

      initSecurityOnPostAuthRequestInterceptor(server);

      server.route([
        {
          method: 'GET',
          path: '/',
          handler: (req: any) => {
            return { path: req.path, url: req.url, basePath: req.getBasePath() };
          },
        },
        {
          method: 'GET',
          path: '/app/{appId}',
          handler: (req: any) => {
            return { path: req.path, url: req.url, basePath: req.getBasePath() };
          },
        },
        {
          method: 'GET',
          path: '/api/foo',
          handler: (req: any) => {
            return { path: req.path, url: req.url, basePath: req.getBasePath() };
          },
        },
      ]);

      teardowns.push(() => server.stop());

      return await server.inject({
        method: 'GET',
        url: path,
        headers,
      });
    };
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  describe('accessing an registered app', () => {
    it('allows the app request if the user is authorized', async () => {
      const response = await request('/app/app-1');
      expect(response.statusCode).toEqual(200);
    });

    it('denies the app request if the user is unauthorized', async () => {
      const response = await request('/app/app-1', { hasAllRequested: false });
      expect(response.statusCode).toEqual(404);
    });

    it('allows requests for unregistered applications', async () => {
      const response = await request('/app/unregistered-application', { hasAllRequested: false });
      expect(response.statusCode).toEqual(200);
    });
  });
});
