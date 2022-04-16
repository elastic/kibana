/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { RouteValidatorConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

import { spacesConfig } from '../../../lib/__fixtures__';
import { SpacesClientService } from '../../../spaces_client';
import { SpacesService } from '../../../spaces_service';
import { usageStatsServiceMock } from '../../../usage_stats/usage_stats_service.mock';
import {
  createMockSavedObjectsRepository,
  createMockSavedObjectsService,
  createSpaces,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';
import { initGetShareableReferencesApi } from './get_shareable_references';

describe('get shareable references', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map((s) => ({ id: s.id, ...s.attributes }));

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();
    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);
    const log = loggingSystemMock.create().get('spaces');
    const coreStart = coreMock.createStart();
    const { savedObjects, savedObjectsClient } = createMockSavedObjectsService(spaces);
    coreStart.savedObjects = savedObjects;

    const clientService = new SpacesClientService(jest.fn());
    clientService
      .setup({ config$: Rx.of(spacesConfig) })
      .setClientRepositoryFactory(() => savedObjectsRepositoryMock);

    const service = new SpacesService();
    service.setup({
      basePath: httpService.basePath,
    });

    const usageStatsServicePromise = Promise.resolve(usageStatsServiceMock.createSetupContract());

    const clientServiceStart = clientService.start(coreStart);

    const spacesServiceStart = service.start({
      basePath: coreStart.http.basePath,
      spacesClientService: clientServiceStart,
    });
    initGetShareableReferencesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      log,
      getSpacesService: () => spacesServiceStart,
      usageStatsServicePromise,
    });

    const [[getShareableReferences, getShareableReferencesRouteHandler]] = router.post.mock.calls;

    return {
      coreStart,
      savedObjectsClient,
      getShareableReferences: {
        routeValidation: getShareableReferences.validate as RouteValidatorConfig<{}, {}, {}>,
        routeHandler: getShareableReferencesRouteHandler,
      },
      savedObjectsRepositoryMock,
    };
  };

  describe('POST /api/spaces/_get_shareable_references', () => {
    it(`returns http/403 when the license is invalid`, async () => {
      const { getShareableReferences } = await setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
      });

      const response = await getShareableReferences.routeHandler(
        mockRouteContextWithInvalidLicense,
        request,
        kibanaResponseFactory
      );

      expect(response.status).toEqual(403);
      expect(response.payload).toEqual({
        message: 'License is invalid for spaces',
      });
    });

    it('passes arguments to the saved objects client and returns the result', async () => {
      const { getShareableReferences, savedObjectsClient } = await setup();
      const reqObj1 = { type: 'a', id: 'id-1' };
      const reqObjects = [reqObj1];
      const payload = { objects: reqObjects };
      const collectedObjects = [
        // the return value of collectMultiNamespaceReferences includes the 1 requested object, along with the 2 references
        { ...reqObj1, spaces: ['space-1'], inboundReferences: [] },
        {
          type: 'b',
          id: 'id-4',
          spaces: ['space-1', '?', '?'],
          inboundReferences: [{ ...reqObj1, name: 'ref-a:1' }],
        },
        {
          type: 'c',
          id: 'id-5',
          spaces: ['space-1', 'space-2'],
          inboundReferences: [{ ...reqObj1, name: 'ref-a:1' }],
        },
      ];
      savedObjectsClient.collectMultiNamespaceReferences.mockResolvedValue({
        objects: collectedObjects,
      });

      const request = httpServerMock.createKibanaRequest({ body: payload, method: 'post' });
      const response = await getShareableReferences.routeHandler(
        mockRouteContext,
        request,
        kibanaResponseFactory
      );

      expect(response.status).toEqual(200);
      expect(response.payload).toEqual({ objects: collectedObjects });
      expect(savedObjectsClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.collectMultiNamespaceReferences).toHaveBeenCalledWith(reqObjects, {
        purpose: 'updateObjectsSpaces',
      });
    });
  });
});
