/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import sinon from 'sinon';

import { SavedObject } from 'src/server/saved_objects';
import { initSpacesRequestInterceptors } from './space_request_interceptors';

describe('interceptors', () => {
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

      initSpacesRequestInterceptors(server);

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

  describe('onPostAuth', () => {
    const serverBasePath = '/my/base/path';
    const defaultRoute = '/app/custom-app';

    const config = {
      'server.basePath': serverBasePath,
      'server.defaultRoute': defaultRoute,
    };

    const setupTest = (hapiServer: any, spaces: SavedObject[], testHandler: any) => {
      hapiServer.plugins.spaces.spacesClient.getScopedClient.mockReturnValue({
        getAll() {
          return spaces;
        },
      });

      // Register test inspector
      hapiServer.ext('onPreResponse', testHandler);
    };

    describe('when accessing an app within a non-existent space', () => {
      it('redirects to the space selector screen', async () => {
        const testHandler = jest.fn((req, h) => {
          const { response } = req;

          if (response && response.isBoom) {
            throw response;
          }

          expect(response.statusCode).toEqual(302);
          expect(response.headers.location).toEqual(serverBasePath);

          return h.continue;
        });

        const spaces = [
          {
            id: 'a-space',
            type: 'space',
            attributes: {
              name: 'a space',
            },
            references: [],
          },
        ];

        await request(
          '/s/not-found/app/kibana',
          (hapiServer: any) => {
            setupTest(hapiServer, spaces, testHandler);
          },
          config
        );

        expect(testHandler).toHaveBeenCalledTimes(1);
      });
    });

    describe('when accessing an API endpoint within a non-existent space', () => {
      it('allows the request to continue', async () => {
        const testHandler = jest.fn((req, h) => {
          const { response } = req;

          if (response && response.isBoom) {
            throw response;
          }

          expect(response.statusCode).toEqual(200);

          return h.continue;
        });

        const spaces = [
          {
            id: 'a-space',
            type: 'space',
            attributes: {
              name: 'a space',
            },
            references: [],
          },
        ];

        await request(
          '/s/not-found/api/foo',
          (hapiServer: any) => {
            setupTest(hapiServer, spaces, testHandler);
          },
          config
        );

        expect(testHandler).toHaveBeenCalledTimes(1);
      });
    });

    describe('with a single available space', () => {
      test('it redirects to the defaultRoute within the context of the single Space when navigating to Kibana root', async () => {
        const testHandler = jest.fn((req, h) => {
          const { response } = req;

          if (response && response.isBoom) {
            throw response;
          }

          expect(response.statusCode).toEqual(302);
          expect(response.headers.location).toEqual(`${serverBasePath}/s/a-space${defaultRoute}`);

          return h.continue;
        });

        const spaces = [
          {
            id: 'a-space',
            type: 'space',
            attributes: {
              name: 'a space',
            },
            references: [],
          },
        ];

        await request(
          '/',
          (hapiServer: any) => {
            setupTest(server, spaces, testHandler);
          },
          config
        );

        expect(testHandler).toHaveBeenCalledTimes(1);
        expect(server.plugins.spaces.spacesClient.getScopedClient).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          })
        );
      });

      test('it redirects to the defaultRoute within the context of the Default Space when navigating to Kibana root', async () => {
        // This is very similar to the test above, but this handles the condition where the only available space is the Default Space,
        // which does not have a URL Context. In this scenario, the end result is the same as the other test, but the final URL the user
        // is redirected to does not contain a space identifier (e.g., /s/foo)

        const testHandler = jest.fn((req, h) => {
          const { response } = req;

          if (response && response.isBoom) {
            throw response;
          }

          expect(response.statusCode).toEqual(302);
          expect(response.headers.location).toEqual(`${serverBasePath}${defaultRoute}`);

          return h.continue;
        });

        const spaces = [
          {
            id: 'default',
            type: 'space',
            attributes: {
              name: 'Default Space',
            },
            references: [],
          },
        ];

        await request(
          '/',
          (hapiServer: any) => {
            setupTest(hapiServer, spaces, testHandler);
          },
          config
        );

        expect(testHandler).toHaveBeenCalledTimes(1);
        expect(server.plugins.spaces.spacesClient.getScopedClient).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          })
        );
      });
    });

    describe('with multiple available spaces', () => {
      test('it redirects to the Space Selector App when navigating to Kibana root', async () => {
        const spaces = [
          {
            id: 'a-space',
            type: 'space',
            attributes: {
              name: 'a space',
            },
            references: [],
          },
          {
            id: 'b-space',
            type: 'space',
            attributes: {
              name: 'b space',
            },
            references: [],
          },
        ];

        const getHiddenUiAppHandler = jest.fn(() => '<div>space selector</div>');

        const testHandler = jest.fn((req, h) => {
          const { response } = req;

          if (response && response.isBoom) {
            throw response;
          }

          expect(response.statusCode).toEqual(200);
          expect(response.source).toEqual({ app: '<div>space selector</div>', renderApp: true });

          return h.continue;
        });

        await request(
          '/',
          (hapiServer: any) => {
            server.decorate('server', 'getHiddenUiAppById', getHiddenUiAppHandler);
            server.decorate('toolkit', 'renderApp', function renderAppHandler(app: any) {
              // @ts-ignore
              this({ renderApp: true, app });
            });

            setupTest(hapiServer, spaces, testHandler);
          },
          config
        );

        expect(getHiddenUiAppHandler).toHaveBeenCalledTimes(1);
        expect(getHiddenUiAppHandler).toHaveBeenCalledWith('space_selector');
        expect(testHandler).toHaveBeenCalledTimes(1);
        expect(server.plugins.spaces.spacesClient.getScopedClient).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          })
        );
      });
    });
  });
});
