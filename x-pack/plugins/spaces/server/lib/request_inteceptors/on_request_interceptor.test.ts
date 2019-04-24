/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import sinon from 'sinon';
import * as Rx from 'rxjs';
import { initSpacesOnRequestInterceptor } from './on_request_interceptor';
import { SpacesService } from '../../new_platform/spaces_service';
import { XPackMainPlugin } from '../../../../xpack_main/xpack_main';
import { SecurityPlugin } from '../../../../security';
import { SpacesAuditLogger } from '../audit_logger';
import { SpacesServiceSetup } from '../../new_platform/spaces_service/spaces_service';
import { ElasticsearchServiceSetup } from 'src/core/server';

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
        elasticsearch: {
          getCluster: jest.fn().mockReturnValue({
            callWithInternalUser: jest.fn(),
            callWithRequest: jest.fn(),
          }),
        },
        spaces: {
          spacesClient: {
            scopedClient: jest.fn(),
          },
        },
      };

      const log = {
        log: jest.fn(),
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
      };

      const spacesService = new SpacesService(log, server.config());
      await spacesService.setup({
        elasticsearch: ({
          adminClient$: Rx.of({
            callAsInternalUser: jest.fn(),
            asScoped: jest.fn(req => ({
              callWithRequest: jest.fn(),
            })),
          }),
        } as unknown) as ElasticsearchServiceSetup,
        savedObjects: server.savedObjects,
        getSecurity: () => ({} as SecurityPlugin),
        spacesAuditLogger: {} as SpacesAuditLogger,
      });

      initSpacesOnRequestInterceptor({
        config: server.config(),
        legacyServer: server,
        log,
        xpackMain: {} as XPackMainPlugin,
        spacesService: {
          scopedClient: jest.fn(),
          getSpaceId: jest.fn(),
          isInDefaultSpace: jest.fn(),
        } as SpacesServiceSetup,
      });

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
