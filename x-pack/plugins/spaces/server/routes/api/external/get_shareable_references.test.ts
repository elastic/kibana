/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { RouteValidatorConfig } from 'src/core/server';
import { kibanaResponseFactory } from 'src/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from 'src/core/server/mocks';

// import { tagSavedObjectTypeName } from '../../../../../saved_objects_tagging/common';
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

const tagSavedObjectTypeName = 'tag'; // TODO: import this from saved_objects_tagging plugin (cannot import directly, generates TS circular graph error)

describe('share to space', () => {
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
      const objects = [
        // 2 requested objects
        { type: tagSavedObjectTypeName, id: 'id-1' },
        { type: 'foo-type', id: 'id-2' },
      ];
      const payload = { objects };
      const collectedObjects = [
        // When mocking these results, they must have the 'spaces' and 'inboundReferences' fields, but the 'inboundReferences' fields can be empty arrays for this unit test
        ...objects.map((x) => ({ ...x, spaces: ['space-1'], inboundReferences: [] })),
        // the return value of collectMultiNamespaceReferences includes the 2 requested objects, along with the 3 related tags/references
        {
          type: tagSavedObjectTypeName,
          id: 'id-3',
          spaces: ['space-1', '?'],
          inboundReferences: [],
        },
        { type: 'bar-type', id: 'id-4', spaces: ['space-1', '?', '?'], inboundReferences: [] },
        { type: 'baz-type', id: 'id-5', spaces: ['space-1', 'space-2'], inboundReferences: [] },
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
      expect(response.payload).toEqual({
        tagsCount: 1, // consumers wouldn't realistically include any tags in the request, but if they did, those tags (id-1) are omitted from this count
        relativesCount: 2, // the requested object (id-2) is omitted from this count
        selectedSpaces: ['space-1'], // every object is in 'space-1', so that is included in selectedSpaces
        partiallySelectedSpaces: ['space-2'], // some but not all objects are in 'space-2', so that is included in partiallySelectedSpaces
        unknownSpacesCount: 2, // this is derived from the max unknown spaces count of any individual object (in this case, id-4 is in 2 unknown spaces)
        objects: collectedObjects,
      });
      expect(savedObjectsClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.collectMultiNamespaceReferences).toHaveBeenCalledWith(objects, {
        purpose: 'updateObjectsSpaces',
      });
    });
  });
});
