/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { ObjectType } from '@kbn/config-schema';
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
import { initUpdateObjectsSpacesApi } from './update_objects_spaces';

describe('update_objects_spaces', () => {
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
    initUpdateObjectsSpacesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      log,
      getSpacesService: () => spacesServiceStart,
      usageStatsServicePromise,
    });

    const [[updateObjectsSpaces, updateObjectsSpacesRouteHandler]] = router.post.mock.calls;

    return {
      coreStart,
      savedObjectsClient,
      updateObjectsSpaces: {
        routeValidation: updateObjectsSpaces.validate as RouteValidatorConfig<{}, {}, {}>,
        routeHandler: updateObjectsSpacesRouteHandler,
      },
      savedObjectsRepositoryMock,
    };
  };

  describe('POST /api/spaces/_update_objects_spaces', () => {
    const objects = [{ id: 'foo', type: 'bar' }];

    it(`returns http/403 when the license is invalid`, async () => {
      const { updateObjectsSpaces } = await setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
      });

      const response = await updateObjectsSpaces.routeHandler(
        mockRouteContextWithInvalidLicense,
        request,
        kibanaResponseFactory
      );

      expect(response.status).toEqual(403);
      expect(response.payload).toEqual({
        message: 'License is invalid for spaces',
      });
    });

    it(`requires space IDs to be unique`, async () => {
      const { updateObjectsSpaces } = await setup();
      const targetSpaces = ['a-space', 'a-space'];
      const payload1 = { objects, spacesToAdd: targetSpaces, spacesToRemove: [] };
      const payload2 = { objects, spacesToAdd: [], spacesToRemove: targetSpaces };

      expect(() =>
        (updateObjectsSpaces.routeValidation.body as ObjectType).validate(payload1)
      ).toThrowErrorMatchingInlineSnapshot(`"[spacesToAdd]: duplicate space ids are not allowed"`);
      expect(() =>
        (updateObjectsSpaces.routeValidation.body as ObjectType).validate(payload2)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[spacesToRemove]: duplicate space ids are not allowed"`
      );
    });

    it(`requires well-formed space IDS`, async () => {
      const { updateObjectsSpaces } = await setup();
      const targetSpaces = ['a-space', 'a-space-invalid-!@#$%^&*()'];
      const payload1 = { objects, spacesToAdd: targetSpaces, spacesToRemove: [] };
      const payload2 = { objects, spacesToAdd: [], spacesToRemove: targetSpaces };

      expect(() =>
        (updateObjectsSpaces.routeValidation.body as ObjectType).validate(payload1)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[spacesToAdd.1]: lower case, a-z, 0-9, \\"_\\", and \\"-\\" are allowed, OR \\"*\\""`
      );
      expect(() =>
        (updateObjectsSpaces.routeValidation.body as ObjectType).validate(payload2)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[spacesToRemove.1]: lower case, a-z, 0-9, \\"_\\", and \\"-\\" are allowed, OR \\"*\\""`
      );
    });

    it(`allows all spaces ("*")`, async () => {
      const { updateObjectsSpaces } = await setup();
      const targetSpaces = ['*'];
      const payload1 = { objects, spacesToAdd: targetSpaces, spacesToRemove: [] };
      const payload2 = { objects, spacesToAdd: [], spacesToRemove: targetSpaces };

      expect(() =>
        (updateObjectsSpaces.routeValidation.body as ObjectType).validate(payload1)
      ).not.toThrowError();
      expect(() =>
        (updateObjectsSpaces.routeValidation.body as ObjectType).validate(payload2)
      ).not.toThrowError();
    });

    it('passes arguments to the saved objects client and returns the result', async () => {
      const { updateObjectsSpaces, savedObjectsClient } = await setup();
      const payload = { objects, spacesToAdd: ['a-space'], spacesToRemove: ['b-space'] };

      const request = httpServerMock.createKibanaRequest({ body: payload, method: 'post' });
      const response = await updateObjectsSpaces.routeHandler(
        mockRouteContext,
        request,
        kibanaResponseFactory
      );

      const { status } = response;
      expect(status).toEqual(200);
      expect(savedObjectsClient.updateObjectsSpaces).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.updateObjectsSpaces).toHaveBeenCalledWith(
        objects,
        payload.spacesToAdd,
        payload.spacesToRemove
      );
    });
  });
});
