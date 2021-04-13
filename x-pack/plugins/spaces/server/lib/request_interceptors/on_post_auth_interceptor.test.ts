/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

// @ts-ignore
import { kibanaTestUser } from '@kbn/test';
import type { CoreSetup, IBasePath, IRouter } from 'src/core/server';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';
import * as kbnTestServer from 'src/core/test_helpers/kbn_server';

import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import type { KibanaFeature } from '../../../../features/server';
import { featuresPluginMock } from '../../../../features/server/mocks';
import { convertSavedObjectToSpace } from '../../routes/lib';
import { spacesClientServiceMock } from '../../spaces_client/spaces_client_service.mock';
import { SpacesService } from '../../spaces_service';
import { initSpacesOnPostAuthRequestInterceptor } from './on_post_auth_interceptor';
import { initSpacesOnRequestInterceptor } from './on_request_interceptor';

// FLAKY: https://github.com/elastic/kibana/issues/55953
describe.skip('onPostAuthInterceptor', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;
  jest.setTimeout(30000);

  const headers = {
    authorization: `Basic ${Buffer.from(
      `${kibanaTestUser.username}:${kibanaTestUser.password}`
    ).toString('base64')}`,
  };

  /**
   *
   * commented out due to hooks being called regardless of skip
   * https://github.com/facebook/jest/issues/8379

   beforeEach(async () => {
    root = kbnTestServer.createRoot();
  });

   afterEach(async () => await root.shutdown());

   */

  function initKbnServer(router: IRouter, basePath: IBasePath) {
    router.get({ path: '/api/np_test/foo', validate: false }, (context, req, h) => {
      return h.ok({ body: { path: req.url.pathname, basePath: basePath.get(req) } });
    });
  }

  async function request(
    path: string,
    availableSpaces: any[],
    testOptions = { simulateGetSpacesFailure: false, simulateGetSingleSpaceFailure: false }
  ) {
    const { http, elasticsearch } = await root.setup();

    // Mock esNodesCompatibility$ to prevent `root.start()` from blocking on ES version check
    elasticsearch.esNodesCompatibility$ = elasticsearchServiceMock.createInternalSetup().esNodesCompatibility$;

    const loggingMock = loggingSystemMock.create().asLoggerFactory().get('xpack', 'spaces');

    const featuresPlugin = featuresPluginMock.createSetup();
    featuresPlugin.getKibanaFeatures.mockReturnValue(([
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
    ] as unknown) as KibanaFeature[]);

    const mockRepository = jest.fn().mockImplementation(() => {
      return {
        get: (type: string, id: string) => {
          if (type === 'space') {
            const space = availableSpaces.find((s) => s.id === id);
            if (space) {
              return space;
            }
            throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
          }
        },
        create: () => null,
      };
    });

    const coreStart = coreMock.createStart();
    coreStart.savedObjects.createInternalRepository.mockImplementation(mockRepository);
    coreStart.savedObjects.createScopedRepository.mockImplementation(mockRepository);

    const service = new SpacesService();

    service.setup({
      basePath: http.basePath,
    });

    const spacesServiceStart = service.start({
      basePath: http.basePath,
      spacesClientService: spacesClientServiceMock.createStart(),
    });

    spacesServiceStart.createSpacesClient = jest.fn().mockReturnValue({
      getAll() {
        if (testOptions.simulateGetSpacesFailure) {
          throw Boom.unauthorized('missing credendials', 'Protected Elasticsearch');
        }
        return Promise.resolve(availableSpaces.map(convertSavedObjectToSpace));
      },
      get(spaceId: string) {
        if (testOptions.simulateGetSingleSpaceFailure) {
          throw Boom.unauthorized('missing credendials', 'Protected Elasticsearch');
        }
        const space = availableSpaces.find((s) => s.id === spaceId);
        if (!space) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError('space', spaceId);
        }
        return Promise.resolve(convertSavedObjectToSpace(space));
      },
    });

    // The onRequest interceptor is also included here because the onPostAuth interceptor requires the onRequest
    // interceptor to parse out the space id and rewrite the request's URL. Rather than duplicating that logic,
    // we are including the already tested interceptor here in the test chain.
    initSpacesOnRequestInterceptor({
      http: (http as unknown) as CoreSetup['http'],
    });

    initSpacesOnPostAuthRequestInterceptor({
      http: (http as unknown) as CoreSetup['http'],
      log: loggingMock,
      features: featuresPlugin,
      getSpacesService: () => spacesServiceStart,
    });

    const router = http.createRouter('/');

    initKbnServer(router, http.basePath);

    await root.start();

    const response = await kbnTestServer.request.get(root, path);

    return {
      response,
      spacesService: spacesServiceStart,
    };
  }

  describe('requests handled completely in the new platform', () => {
    it('redirects to the space selector screen when accessing an app within a non-existent space', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
          },
        },
      ];

      const { response } = await request('/s/not-found/app/np_kibana', spaces);

      expect(response.status).toEqual(302);
      expect(response.header.location).toEqual(`/spaces/space_selector`);
    });

    it('allows the request to continue when accessing an API endpoint within a non-existent space', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
          },
        },
      ];

      const { response } = await request('/s/not-found/api/np_test/foo', spaces);

      expect(response.status).toEqual(200);
    });
  });

  it('handles space retrieval errors gracefully when requesting the root, responding with headers returned from ES', async () => {
    const spaces = [
      {
        id: 'a-space',
        type: 'space',
        attributes: {
          name: 'a space',
        },
      },
    ];

    const { response, spacesService } = await request('/', spaces, {
      simulateGetSpacesFailure: true,
      simulateGetSingleSpaceFailure: false,
    });

    expect(response.status).toEqual(401);

    expect(response.header).toMatchObject({
      'www-authenticate': `Protected Elasticsearch error="missing credendials"`,
    });

    expect(response.body).toMatchInlineSnapshot(`
                        Object {
                          "error": "Unauthorized",
                          "message": "missing credendials",
                          "statusCode": 401,
                        }
                `);

    expect(spacesService.createSpacesClient).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: headers.authorization,
        }),
      })
    );
  });

  it('handles space retrieval errors gracefully when requesting an app, responding with headers returned from ES', async () => {
    const spaces = [
      {
        id: 'a-space',
        type: 'space',
        attributes: {
          name: 'a space',
        },
      },
    ];

    const { response, spacesService } = await request('/app/kibana', spaces, {
      simulateGetSpacesFailure: false,
      simulateGetSingleSpaceFailure: true,
    });

    expect(response.status).toEqual(401);

    expect(response.header).toMatchObject({
      'www-authenticate': `Protected Elasticsearch error="missing credendials"`,
    });

    expect(response.body).toMatchInlineSnapshot(`
      Object {
        "error": "Unauthorized",
        "message": "missing credendials",
        "statusCode": 401,
      }
    `);

    expect(spacesService.createSpacesClient).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: headers.authorization,
        }),
      })
    );
  });

  it('redirects to the space selector when accessing the root of the default space', async () => {
    const spaces = [
      {
        id: 'default',
        type: 'space',
        attributes: {
          name: 'Default space',
          _reserved: true,
        },
      },
      {
        id: 'a-space',
        type: 'space',
        attributes: {
          name: 'a space',
        },
      },
    ];

    const { response, spacesService } = await request('/', spaces);

    expect(response.status).toEqual(302);
    expect(response.header.location).toEqual(`/spaces/space_selector`);

    expect(spacesService.createSpacesClient).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: headers.authorization,
        }),
      })
    );
  });

  it('redirects to the "enter space" endpoint when accessing the root of a non-default space', async () => {
    const spaces = [
      {
        id: 'default',
        type: 'space',
        attributes: {
          name: 'Default space',
          _reserved: true,
        },
      },
      {
        id: 'a-space',
        type: 'space',
        attributes: {
          name: 'a space',
        },
      },
    ];

    const { response, spacesService } = await request('/s/a-space', spaces);

    expect(response.status).toEqual(302);
    expect(response.header.location).toEqual(`/s/a-space/spaces/enter`);

    expect(spacesService.createSpacesClient).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: headers.authorization,
        }),
      })
    );
  });

  describe('with a single available space', () => {
    it('it redirects to the "enter space" endpoint within the context of the single Space when navigating to Kibana root', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
          },
        },
      ];

      const { response, spacesService } = await request('/', spaces);

      expect(response.status).toEqual(302);
      expect(response.header.location).toEqual(`/s/a-space/spaces/enter`);

      expect(spacesService.createSpacesClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    it('it redirects to the "enter space" endpoint within the context of the Default Space when navigating to Kibana root', async () => {
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

      const { response, spacesService } = await request('/', spaces);

      expect(response.status).toEqual(302);
      expect(response.header.location).toEqual('/spaces/enter');
      expect(spacesService.createSpacesClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    it('it allows navigation to apps when none are disabled', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
            disabledFeatures: [],
          },
        },
      ];

      const { response, spacesService } = await request('/s/a-space/app/kibana', spaces);

      expect(response.status).toEqual(200);

      expect(spacesService.createSpacesClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    it('allows navigation to app that is granted by multiple features, when only one of those features is disabled', async () => {
      const spaces = [
        {
          id: 'a-space',
          type: 'space',
          attributes: {
            name: 'a space',
            disabledFeatures: ['feature-1'],
          },
        },
      ];

      const { response, spacesService } = await request('/s/a-space/app/app-1', spaces);

      expect(response.status).toEqual(200);

      expect(spacesService.createSpacesClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });

    it('does not allow navigation to apps that are only provided by a disabled feature', async () => {
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

      const { response, spacesService } = await request('/s/a-space/app/app-2', spaces);

      expect(response.status).toEqual(404);

      expect(spacesService.createSpacesClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: headers.authorization,
          }),
        })
      );
    });
  });
});
