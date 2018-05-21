/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import { Server } from 'hapi';
import { initSpacesRequestInterceptors } from './space_request_interceptors';

describe('interceptors', () => {
  const sandbox = sinon.sandbox.create();
  const teardowns = [];
  let request;

  beforeEach(() => {
    teardowns.push(() => sandbox.restore());
    request = async (path, setupFn = () => { }) => {

      const server = new Server();

      server.connection({ port: 0 });

      initSpacesRequestInterceptors(server);

      server.route({
        method: 'GET',
        path: '/',
        handler: (req, reply) => {
          return reply({ path: req.path, url: req.url, basePath: req.getBasePath() });
        }
      });

      await setupFn(server);

      server.decorate('request', 'getBasePath', jest.fn());
      server.decorate('request', 'setBasePath', jest.fn());

      teardowns.push(() => server.stop());

      return await server.inject({
        method: 'GET',
        url: path,
      });
    };
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  describe('onRequest', () => {
    test('handles paths without a space identifier', async () => {
      const testHandler = jest.fn((req, reply) => {
        expect(req.path).toBe("/");
        return reply.continue();
      });

      await request('/', (server) => {
        server.ext('onRequest', testHandler);
      });

      expect(testHandler).toHaveBeenCalledTimes(1);
    });

    test('strips the Space URL Context from the request', async () => {
      const testHandler = jest.fn((req, reply) => {
        expect(req.path).toBe("/");
        return reply.continue();
      });

      await request('/s/foo', (server) => {
        server.ext('onRequest', testHandler);
      });

      expect(testHandler).toHaveBeenCalledTimes(1);
    });

    test('ignores space identifiers in the middle of the path', async () => {
      const testHandler = jest.fn((req, reply) => {
        expect(req.path).toBe("/some/path/s/foo/bar");
        return reply.continue();
      });

      await request('/some/path/s/foo/bar', (server) => {
        server.ext('onRequest', testHandler);
      });

      expect(testHandler).toHaveBeenCalledTimes(1);
    });

    test('strips the Space URL Context from the request, maintaining the rest of the path', async () => {
      const testHandler = jest.fn((req, reply) => {
        expect(req.path).toBe('/i/love/spaces.html');
        expect(req.query).toEqual({
          queryParam: 'queryValue'
        });
        return reply.continue();
      });

      await request('/s/foo/i/love/spaces.html?queryParam=queryValue', (server) => {
        server.ext('onRequest', testHandler);
      });

      expect(testHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('onPostAuth', () => {
    const serverBasePath = '/my/base/path';
    const defaultRoute = '/app/custom-app';

    const config = {
      'server.basePath': serverBasePath,
      'server.defaultRoute': defaultRoute
    };

    const setupTest = (server, spaces, testHandler) => {
      // Mock server.config()
      server.decorate('server', 'config', () => {
        return {
          get: (key) => {
            return config[key];
          }
        };
      });

      // Mock server.getSavedObjectsClient()
      server.decorate('request', 'getSavedObjectsClient', () => {
        return {
          find: jest.fn(() => {
            return {
              total: spaces.length,
              saved_objects: spaces
            };
          })
        };
      });

      // Register test inspector
      server.ext('onPreResponse', testHandler);
    };

    describe('with a single available space', () => {
      test('it redirects to the defaultRoute within the context of the single Space when navigating to Kibana root', async () => {
        const testHandler = jest.fn((req, reply) => {
          const { response } = req;

          if (response && response.isBoom) {
            throw response;
          }

          expect(response.statusCode).toEqual(302);
          expect(response.headers.location).toEqual(`${serverBasePath}/s/a-space${defaultRoute}`);

          return reply.continue();
        });

        const spaces = [{
          id: 'space:a-space',
          attributes: {
            name: 'a space',
            urlContext: 'a-space',
          }
        }];

        await request('/', (server) => {
          setupTest(server, spaces, testHandler);
        });

        expect(testHandler).toHaveBeenCalledTimes(1);
      });

      test('it redirects to the defaultRoute within the context of the Default Space when navigating to Kibana root', async () => {
        // This is very similar to the test above, but this handles the condition where the only available space is the Default Space,
        // which does not have a URL Context. In this scenario, the end result is the same as the other test, but the final URL the user
        // is redirected to does not contain a space identifier (e.g., /s/foo)

        const testHandler = jest.fn((req, reply) => {
          const { response } = req;

          if (response && response.isBoom) {
            throw response;
          }

          expect(response.statusCode).toEqual(302);
          expect(response.headers.location).toEqual(`${serverBasePath}${defaultRoute}`);

          return reply.continue();
        });

        const spaces = [{
          id: 'space:default',
          attributes: {
            name: 'Default Space',
            urlContext: '',
          }
        }];

        await request('/', (server) => {
          setupTest(server, spaces, testHandler);
        });

        expect(testHandler).toHaveBeenCalledTimes(1);
      });
    });

    describe('with multiple available spaces', () => {
      test('it redirects to the Space Selector App when navigating to Kibana root', async () => {

        const spaces = [{
          id: 'space:a-space',
          attributes: {
            name: 'a space',
            urlContext: 'a-space',
          }
        }, {
          id: 'space:b-space',
          attributes: {
            name: 'b space',
            urlContext: 'b-space',
          }
        }];

        const getHiddenUiAppHandler = jest.fn(() => { return '<div>space selector</div>'; });

        const testHandler = jest.fn((req, reply) => {
          const { response } = req;

          if (response && response.isBoom) {
            throw response;
          }

          expect(response.statusCode).toEqual(200);
          expect(response.source).toEqual({ "app": "<div>space selector</div>", "renderApp": true });

          return reply.continue();
        });

        await request('/', (server) => {
          server.decorate('server', 'getHiddenUiAppById', getHiddenUiAppHandler);
          server.decorate('reply', 'renderApp', function (app) {
            this({ renderApp: true, app });
          });

          setupTest(server, spaces, testHandler);
        });

        expect(getHiddenUiAppHandler).toHaveBeenCalledTimes(1);
        expect(getHiddenUiAppHandler).toHaveBeenCalledWith('space_selector');
        expect(testHandler).toHaveBeenCalledTimes(1);
      });
    });
  });
});
