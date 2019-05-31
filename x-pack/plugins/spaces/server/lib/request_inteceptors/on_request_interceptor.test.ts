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
    request = async (path: string) => {
      server = new Server();

      interface Config {
        [key: string]: any;
      }
      const config: Config = {
        'server.basePath': '/foo',
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
          path: '/some/path/s/foo/bar',
          handler: (req: any) => {
            return { path: req.path, url: req.url, basePath: req.getBasePath() };
          },
        },
        {
          method: 'GET',
          path: '/i/love/spaces',
          handler: (req: any) => {
            return { path: req.path, query: req.query, url: req.url, basePath: req.getBasePath() };
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
      const response = await request('/');

      expect(response.statusCode).toEqual(200);
      expect(JSON.parse(response.payload)).toMatchObject({
        path: '/',
        url: {
          path: '/',
          pathname: '/',
          href: '/',
        },
      });
    });

    test('strips the Space URL Context from the request', async () => {
      const response = await request('/s/foo');
      expect(response.statusCode).toEqual(200);
      expect(JSON.parse(response.payload)).toMatchObject({
        path: '/',
        url: {
          path: '/',
          pathname: '/',
          href: '/',
        },
      });
    });

    test('ignores space identifiers in the middle of the path', async () => {
      const response = await request('/some/path/s/foo/bar');
      expect(response.statusCode).toEqual(200);
      expect(JSON.parse(response.payload)).toMatchObject({
        path: '/some/path/s/foo/bar',
        url: {
          path: '/some/path/s/foo/bar',
          pathname: '/some/path/s/foo/bar',
          href: '/some/path/s/foo/bar',
        },
      });
    });

    test('strips the Space URL Context from the request, maintaining the rest of the path', async () => {
      const response = await request('/s/foo/i/love/spaces?queryParam=queryValue');
      expect(response.statusCode).toEqual(200);
      expect(JSON.parse(response.payload)).toMatchObject({
        path: '/i/love/spaces',
        query: {
          queryParam: 'queryValue',
        },
        url: {
          path: '/i/love/spaces',
          pathname: '/i/love/spaces',
          href: '/i/love/spaces',
        },
      });
    });
  });
});
