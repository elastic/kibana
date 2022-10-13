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
import { usageStatsClientMock } from '../../../usage_stats/usage_stats_client.mock';
import { usageStatsServiceMock } from '../../../usage_stats/usage_stats_service.mock';
import {
  createExportSavedObjectsToStreamMock,
  createImportSavedObjectsFromStreamMock,
  createMockSavedObjectsRepository,
  createMockSavedObjectsService,
  createResolveSavedObjectsImportErrorsMock,
  createSpaces,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';
import { initCopyToSpacesApi } from './copy_to_space';

describe('copy to space', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map((s) => ({ id: s.id, ...s.attributes }));

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const log = loggingSystemMock.create().get('spaces');

    const coreStart = coreMock.createStart();
    const { savedObjects, savedObjectsExporter, savedObjectsImporter } =
      createMockSavedObjectsService(spaces);
    coreStart.savedObjects = savedObjects;
    savedObjectsExporter.exportByObjects.mockImplementation(createExportSavedObjectsToStreamMock());
    savedObjectsImporter.import.mockImplementation(createImportSavedObjectsFromStreamMock());
    savedObjectsImporter.resolveImportErrors.mockImplementation(
      createResolveSavedObjectsImportErrorsMock()
    );

    const clientService = new SpacesClientService(jest.fn());
    clientService
      .setup({ config$: Rx.of(spacesConfig) })
      .setClientRepositoryFactory(() => savedObjectsRepositoryMock);

    const service = new SpacesService();
    service.setup({
      basePath: httpService.basePath,
    });

    const usageStatsClient = usageStatsClientMock.create();
    const usageStatsServicePromise = Promise.resolve(
      usageStatsServiceMock.createSetupContract(usageStatsClient)
    );

    const clientServiceStart = clientService.start(coreStart);

    const spacesServiceStart = service.start({
      basePath: coreStart.http.basePath,
      spacesClientService: clientServiceStart,
    });

    initCopyToSpacesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      log,
      getSpacesService: () => spacesServiceStart,
      usageStatsServicePromise,
    });

    const [[ctsRouteDefinition, ctsRouteHandler], [resolveRouteDefinition, resolveRouteHandler]] =
      router.post.mock.calls;

    return {
      coreStart,
      copyToSpace: {
        routeValidation: ctsRouteDefinition.validate as RouteValidatorConfig<{}, {}, {}>,
        routeHandler: ctsRouteHandler,
      },
      resolveConflicts: {
        routeValidation: resolveRouteDefinition.validate as RouteValidatorConfig<{}, {}, {}>,
        routeHandler: resolveRouteHandler,
      },
      savedObjectsRepositoryMock,
      savedObjectsExporter,
      savedObjectsImporter,
      usageStatsClient,
    };
  };

  describe('POST /api/spaces/_copy_saved_objects', () => {
    it(`returns http/403 when the license is invalid`, async () => {
      const { copyToSpace } = await setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
      });

      const response = await copyToSpace.routeHandler(
        mockRouteContextWithInvalidLicense,
        request,
        kibanaResponseFactory
      );

      expect(response.status).toEqual(403);
      expect(response.payload).toEqual({
        message: 'License is invalid for spaces',
      });
    });

    it(`records usageStats data`, async () => {
      const createNewCopies = Symbol();
      const overwrite = Symbol();
      const payload = { spaces: ['a-space'], objects: [], createNewCopies, overwrite };

      const { copyToSpace, usageStatsClient } = await setup();

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      await copyToSpace.routeHandler(mockRouteContext, request, kibanaResponseFactory);

      expect(usageStatsClient.incrementCopySavedObjects).toHaveBeenCalledWith({
        headers: request.headers,
        createNewCopies,
        overwrite,
      });
    });

    it(`uses a Saved Objects Client instance without the spaces wrapper`, async () => {
      const payload = {
        spaces: ['a-space'],
        objects: [],
      };

      const { copyToSpace, coreStart } = await setup();

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      await copyToSpace.routeHandler(mockRouteContext, request, kibanaResponseFactory);

      expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(request, {
        excludedWrappers: ['spaces'],
      });
    });

    it(`requires space IDs to be unique`, async () => {
      const payload = {
        spaces: ['a-space', 'a-space'],
        objects: [],
      };

      const { copyToSpace } = await setup();

      expect(() =>
        (copyToSpace.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(`"[spaces]: duplicate space ids are not allowed"`);
    });

    it(`requires well-formed space IDS`, async () => {
      const payload = {
        spaces: ['a-space', 'a-space-invalid-!@#$%^&*()'],
        objects: [],
      };

      const { copyToSpace } = await setup();

      expect(() =>
        (copyToSpace.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[spaces.1]: lower case, a-z, 0-9, \\"_\\", and \\"-\\" are allowed"`
      );
    });

    it(`does not allow "overwrite" to be used with "createNewCopies"`, async () => {
      const payload = {
        spaces: ['a-space'],
        objects: [{ type: 'foo', id: 'bar' }],
        overwrite: true,
        createNewCopies: true,
      };

      const { copyToSpace } = await setup();

      expect(() =>
        (copyToSpace.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(`"cannot use [overwrite] with [createNewCopies]"`);
    });

    it(`requires objects to be unique`, async () => {
      const payload = {
        spaces: ['a-space'],
        objects: [
          { type: 'foo', id: 'bar' },
          { type: 'foo', id: 'bar' },
        ],
      };

      const { copyToSpace } = await setup();

      expect(() =>
        (copyToSpace.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(`"[objects]: duplicate objects are not allowed"`);
    });

    it('copies to multiple spaces', async () => {
      const payload = {
        spaces: ['a-space', 'b-space'],
        objects: [{ type: 'visualization', id: 'bar' }],
      };

      const { copyToSpace, savedObjectsImporter } = await setup();

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      const response = await copyToSpace.routeHandler(
        mockRouteContext,
        request,
        kibanaResponseFactory
      );

      const { status } = response;

      expect(status).toEqual(200);
      expect(savedObjectsImporter.import).toHaveBeenCalledTimes(2);
      const [firstImportCallOptions] = savedObjectsImporter.import.mock.calls[0];

      expect(firstImportCallOptions).toMatchObject({
        namespace: 'a-space',
      });

      const [secondImportCallOptions] = savedObjectsImporter.import.mock.calls[1];

      expect(secondImportCallOptions).toMatchObject({
        namespace: 'b-space',
      });
    });
  });

  describe('POST /api/spaces/_resolve_copy_saved_objects_errors', () => {
    it(`returns http/403 when the license is invalid`, async () => {
      const { resolveConflicts } = await setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
      });

      const response = await resolveConflicts.routeHandler(
        mockRouteContextWithInvalidLicense,
        request,
        kibanaResponseFactory
      );

      expect(response.status).toEqual(403);
      expect(response.payload).toEqual({
        message: 'License is invalid for spaces',
      });
    });

    it(`records usageStats data`, async () => {
      const createNewCopies = Symbol();
      const payload = { retries: {}, objects: [], createNewCopies };

      const { resolveConflicts, usageStatsClient } = await setup();

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      await resolveConflicts.routeHandler(mockRouteContext, request, kibanaResponseFactory);

      expect(usageStatsClient.incrementResolveCopySavedObjectsErrors).toHaveBeenCalledWith({
        headers: request.headers,
        createNewCopies,
      });
    });

    it(`uses a Saved Objects Client instance without the spaces wrapper`, async () => {
      const payload = {
        retries: {
          ['a-space']: [
            {
              type: 'visualization',
              id: 'bar',
              overwrite: true,
            },
          ],
        },
        objects: [{ type: 'visualization', id: 'bar' }],
      };

      const { resolveConflicts, coreStart } = await setup();

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      await resolveConflicts.routeHandler(mockRouteContext, request, kibanaResponseFactory);

      expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(request, {
        excludedWrappers: ['spaces'],
      });
    });

    it(`requires objects to be unique`, async () => {
      const payload = {
        retries: {},
        objects: [
          { type: 'foo', id: 'bar' },
          { type: 'foo', id: 'bar' },
        ],
      };

      const { resolveConflicts } = await setup();

      expect(() =>
        (resolveConflicts.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(`"[objects]: duplicate objects are not allowed"`);
    });

    it(`requires well-formed space ids`, async () => {
      const payload = {
        retries: {
          ['invalid-space-id!@#$%^&*()']: [
            {
              type: 'foo',
              id: 'bar',
              overwrite: true,
            },
          ],
        },
        objects: [{ type: 'foo', id: 'bar' }],
      };

      const { resolveConflicts } = await setup();

      expect(() =>
        (resolveConflicts.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[retries.key(\\"invalid-space-id!@#$%^&*()\\")]: Invalid space id: invalid-space-id!@#$%^&*()"`
      );
    });

    it('resolves conflicts for multiple spaces', async () => {
      const payload = {
        objects: [{ type: 'visualization', id: 'bar' }],
        retries: {
          ['a-space']: [
            {
              type: 'visualization',
              id: 'bar',
              overwrite: true,
            },
          ],
          ['b-space']: [
            {
              type: 'globalType',
              id: 'bar',
              overwrite: true,
            },
          ],
        },
      };

      const { resolveConflicts, savedObjectsImporter } = await setup();

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      const response = await resolveConflicts.routeHandler(
        mockRouteContext,
        request,
        kibanaResponseFactory
      );

      const { status } = response;

      expect(status).toEqual(200);
      expect(savedObjectsImporter.resolveImportErrors).toHaveBeenCalledTimes(2);
      const [resolveImportErrorsFirstCallOptions] =
        savedObjectsImporter.resolveImportErrors.mock.calls[0];

      expect(resolveImportErrorsFirstCallOptions).toMatchObject({ namespace: 'a-space' });

      const [resolveImportErrorsSecondCallOptions] =
        savedObjectsImporter.resolveImportErrors.mock.calls[1];

      expect(resolveImportErrorsSecondCallOptions).toMatchObject({ namespace: 'b-space' });
    });
  });
});
