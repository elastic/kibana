/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import sinon from 'sinon';

import { initSpacesOnRequestInterceptor } from './on_request_interceptor';

describe('onRequestInterceptor', () => {
  const sandbox = sinon.sandbox.create();
  const teardowns: Array<() => void> = [];
  const headers = {
    authorization: 'foo',
  };
  let server: any;
  let request: any;

  beforeEach(() => {
    teardowns.push(() => sandbox.restore());
    request = async (
      path: string,
      setupFn: (ser: any) => void = () => {
        return;
      },
      testConfig = {}
    ) => {
      server = new Server();

      interface Config {
        [key: string]: any;
      }
      const config: Config = {
        'server.basePath': '/foo',
        ...testConfig,
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

      server.savedObjects = {
        SavedObjectsClient: {
          errors: {
            isNotFoundError: (e: Error) => e.message === 'space not found',
          },
        },
        getSavedObjectsRepository: jest.fn().mockImplementation(() => {
          return {
            get: (type: string, id: string) => {
              if (type === 'space') {
                if (id === 'not-found') {
                  throw new Error('space not found');
                }
                return {
                  id,
                  name: 'test space',
                };
              }
            },
            create: () => null,
          };
        }),
      };

      server.plugins = {
        spaces: {
          spacesClient: {
            getScopedClient: jest.fn(),
          },
        },
      };

      initSpacesOnRequestInterceptor(server);

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
          path: '/app/kibana',
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

      await setupFn(server);

      let basePath: string | undefined;
      server.decorate('request', 'getBasePath', () => basePath);
      server.decorate('request', 'setBasePath', (newPath: string) => {
        basePath = newPath;
      });

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

  describe('onRequest', () => {
    test('handles paths without a space identifier', async () => {
      const testHandler = jest.fn((req, h) => {
        expect(req.path).toBe('/');
        return h.continue;
      });

      await request('/', (hapiServer: any) => {
        hapiServer.ext('onRequest', testHandler);
      });

      expect(testHandler).toHaveBeenCalledTimes(1);
    });

    test('strips the Space URL Context from the request', async () => {
      const testHandler = jest.fn((req, h) => {
        expect(req.path).toBe('/');
        return h.continue;
      });

      await request('/s/foo', (hapiServer: any) => {
        hapiServer.ext('onRequest', testHandler);
      });

      expect(testHandler).toHaveBeenCalledTimes(1);
    });

    test('ignores space identifiers in the middle of the path', async () => {
      const testHandler = jest.fn((req, h) => {
        expect(req.path).toBe('/some/path/s/foo/bar');
        return h.continue;
      });

      await request('/some/path/s/foo/bar', (hapiServer: any) => {
        hapiServer.ext('onRequest', testHandler);
      });

      expect(testHandler).toHaveBeenCalledTimes(1);
    });

    test('strips the Space URL Context from the request, maintaining the rest of the path', async () => {
      const testHandler = jest.fn((req, h) => {
        expect(req.path).toBe('/i/love/spaces.html');
        expect(req.query).toEqual({
          queryParam: 'queryValue',
        });
        return h.continue;
      });

      await request('/s/foo/i/love/spaces.html?queryParam=queryValue', (hapiServer: any) => {
        hapiServer.ext('onRequest', testHandler);
      });

      expect(testHandler).toHaveBeenCalledTimes(1);
    });
  });
});
