/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import sinon from 'sinon';

import { SavedObject } from 'src/legacy/server/saved_objects';
import { Feature } from '../../../../xpack_main/types';
import { convertSavedObjectToSpace } from '../../routes/lib';
import { initSpacesOnPostAuthRequestInterceptor } from './on_post_auth_interceptor';
import { initSpacesOnRequestInterceptor } from './on_request_interceptor';

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
      spaces: SavedObject[],
      setupFn: (server: Server) => null = () => null
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
                const space = spaces.find(s => s.id === id);
                if (space) {
                  return space;
                }
                throw new Error('space not found');
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
        xpack_main: {
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
              {
                id: 'feature-5',
                name: 'feature 4',
                app: ['kibana'],
              },
            ] as Feature[],
        },
      };

      let basePath: string | undefined;
      server.decorate('request', 'getBasePath', () => basePath);
      server.decorate('request', 'setBasePath', (newPath: string) => {
        basePath = newPath;
      });

      // The onRequest interceptor is also included here because the onPostAuth interceptor requires the onRequest
      // interceptor to parse out the space id and rewrite the request's URL. Rather than duplicating that logic,
      // we are including the already tested interceptor here in the test chain.
      initSpacesOnRequestInterceptor(server);
      initSpacesOnPostAuthRequestInterceptor(server);

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

      server.plugins.spaces.spacesClient.getScopedClient.mockReturnValue({
        getAll() {
          return spaces.map(convertSavedObjectToSpace);
        },
        get(spaceId: string) {
          const space = spaces.find(s => s.id === spaceId);
          if (!space) {
            throw new Error('space not found');
          }
          return convertSavedObjectToSpace(space);
        },
      });

      await setupFn(server);

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

  describe('when accessing an app within a non-existent space', () => {
    it('redirects to the space selector screen', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
          },
        },
      ];

      const response = await request('/s/not-found/app/kibana', spaces);

      expect(response.statusCode).toEqual(302);
      expect(response.headers.location).toEqual(serverBasePath);
    });
  });

  it('when accessing the kibana app it always allows the request to continue', async () => {
    const spaces = [
      {
        id: 'a-space',
        type: 'space',
        attributes: {
          name: 'a space',
          disabledFeatures: ['feature-1', 'feature-2', 'feature-4', 'feature-5'],
        },
      },
    ];

    const response = await request('/s/a-space/app/kibana', spaces);

    expect(response.statusCode).toEqual(200);
  });

  describe('when accessing an API endpoint within a non-existent space', () => {
    it('allows the request to continue', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
          },
        },
      ];

      const response = await request('/s/not-found/api/foo', spaces);

      expect(response.statusCode).toEqual(200);
    });
  });

  describe('with a single available space', () => {
    test('it redirects to the defaultRoute within the context of the single Space when navigating to Kibana root', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
          },
        },
      ];

      const response = await request('/', spaces);

      expect(response.statusCode).toEqual(302);
      expect(response.headers.location).toEqual(`${serverBasePath}/s/a-space${defaultRoute}`);

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

      const spaces = [
        {
          id: 'default',
          type: 'space',
          attributes: {
            name: 'Default Space',
          },
        },
      ];

      const response = await request('/', spaces);

      expect(response.statusCode).toEqual(302);
      expect(response.headers.location).toEqual(`${serverBasePath}${defaultRoute}`);
      expect(server.plugins.spaces.spacesClient.getScopedClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    test('it allows navigation to apps when none are disabled', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
            disabledFeatures: [] as any,
          },
        },
      ];

      const response = await request('/s/a-space/app/kibana', spaces);

      expect(response.statusCode).toEqual(200);

      expect(server.plugins.spaces.spacesClient.getScopedClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    test('allows navigation to app that is granted by multiple features, when only one of those features is disabled', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
            disabledFeatures: ['feature-1'] as any,
          },
        },
      ];

      const response = await request('/s/a-space/app/app-1', spaces);

      expect(response.statusCode).toEqual(200);

      expect(server.plugins.spaces.spacesClient.getScopedClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    test('does not allow navigation to apps that are only provided by a disabled feature', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
            disabledFeatures: ['feature-2'] as any,
          },
        },
      ];

      const response = await request('/s/a-space/app/app-2', spaces);

      expect(response.statusCode).toEqual(404);

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
        },
        {
          id: 'b-space',
          type: 'space',
          attributes: {
            name: 'b space',
          },
        },
      ];

      const getHiddenUiAppHandler = jest.fn(() => '<div>space selector</div>');

      const response = await request('/', spaces, function setupFn() {
        server.decorate('server', 'getHiddenUiAppById', getHiddenUiAppHandler);
        server.decorate('toolkit', 'renderApp', function renderAppHandler(app: any) {
          // @ts-ignore
          return this.response(app);
        });
      });

      expect(response.statusCode).toEqual(200);
      expect(response.payload).toEqual('<div>space selector</div>');

      expect(getHiddenUiAppHandler).toHaveBeenCalledTimes(1);
      expect(getHiddenUiAppHandler).toHaveBeenCalledWith('space_selector');
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
