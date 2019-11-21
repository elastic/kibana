/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import {
  createSpaces,
  createLegacyAPI,
  createMockSavedObjectsRepository,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';
import { CoreSetup, IRouter, kibanaResponseFactory } from 'src/core/server';
import {
  loggingServiceMock,
  elasticsearchServiceMock,
  httpServiceMock,
  httpServerMock,
} from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { SpacesClient } from '../../../lib/spaces_client';
import { initCopyToSpacesApi } from './copy_to_space';
import { ObjectType } from '@kbn/config-schema';
import { RouteSchemas } from 'src/core/server/http/router/route';
import { spacesConfig } from '../../../lib/__fixtures__';
import { securityMock } from '../../../../../security/server/mocks';

describe('copy to space', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map(s => ({ id: s.id, ...s.attributes }));

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    const legacyAPI = createLegacyAPI({ spaces });

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const log = loggingServiceMock.create().get('spaces');

    const service = new SpacesService(log, () => legacyAPI);
    const spacesService = await service.setup({
      http: (httpService as unknown) as CoreSetup['http'],
      elasticsearch: elasticsearchServiceMock.createSetupContract(),
      authorization: securityMock.createSetup().authz,
      getSpacesAuditLogger: () => ({} as SpacesAuditLogger),
      config$: Rx.of(spacesConfig),
    });

    spacesService.scopedClient = jest.fn((req: any) => {
      return Promise.resolve(
        new SpacesClient(
          null as any,
          () => null,
          null,
          savedObjectsRepositoryMock,
          spacesConfig,
          savedObjectsRepositoryMock,
          req
        )
      );
    });

    initCopyToSpacesApi({
      externalRouter: router,
      getSavedObjects: () => legacyAPI.savedObjects,
      log,
      spacesService,
    });

    const [
      [ctsRouteDefinition, ctsRouteHandler],
      [resolveRouteDefinition, resolveRouteHandler],
    ] = router.post.mock.calls;

    return {
      copyToSpace: {
        routeValidation: ctsRouteDefinition.validate as RouteSchemas<
          ObjectType,
          ObjectType,
          ObjectType
        >,
        routeHandler: ctsRouteHandler,
      },
      resolveConflicts: {
        routeValidation: resolveRouteDefinition.validate as RouteSchemas<
          ObjectType,
          ObjectType,
          ObjectType
        >,
        routeHandler: resolveRouteHandler,
      },
      savedObjectsRepositoryMock,
      legacyAPI,
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

    it(`uses a Saved Objects Client instance without the spaces wrapper`, async () => {
      const payload = {
        spaces: ['a-space'],
        objects: [],
      };

      const { copyToSpace, legacyAPI } = await setup();

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      await copyToSpace.routeHandler(mockRouteContext, request, kibanaResponseFactory);

      expect(legacyAPI.savedObjects.getScopedSavedObjectsClient).toHaveBeenCalledWith(
        expect.any(Object),
        {
          excludedWrappers: ['spaces'],
        }
      );
    });

    it(`requires space IDs to be unique`, async () => {
      const payload = {
        spaces: ['a-space', 'a-space'],
        objects: [],
      };

      const { copyToSpace } = await setup();

      expect(() =>
        copyToSpace.routeValidation.body!.validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(`"[spaces]: duplicate space ids are not allowed"`);
    });

    it(`requires well-formed space IDS`, async () => {
      const payload = {
        spaces: ['a-space', 'a-space-invalid-!@#$%^&*()'],
        objects: [],
      };

      const { copyToSpace } = await setup();

      expect(() =>
        copyToSpace.routeValidation.body!.validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[spaces.1]: lower case, a-z, 0-9, \\"_\\", and \\"-\\" are allowed"`
      );
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
        copyToSpace.routeValidation.body!.validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(`"[objects]: duplicate objects are not allowed"`);
    });

    it('does not allow namespace agnostic types to be copied (via "supportedTypes" property)', async () => {
      const payload = {
        spaces: ['a-space'],
        objects: [
          { type: 'globalType', id: 'bar' },
          { type: 'visualization', id: 'bar' },
        ],
      };

      const { copyToSpace, legacyAPI } = await setup();

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
      expect(legacyAPI.savedObjects.importExport.importSavedObjects).toHaveBeenCalledTimes(1);
      const [importCallOptions] = (legacyAPI.savedObjects.importExport
        .importSavedObjects as any).mock.calls[0];

      expect(importCallOptions).toMatchObject({
        namespace: 'a-space',
        supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
      });
    });

    it('copies to multiple spaces', async () => {
      const payload = {
        spaces: ['a-space', 'b-space'],
        objects: [{ type: 'visualization', id: 'bar' }],
      };

      const { copyToSpace, legacyAPI } = await setup();

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
      expect(legacyAPI.savedObjects.importExport.importSavedObjects).toHaveBeenCalledTimes(2);
      const [firstImportCallOptions] = (legacyAPI.savedObjects.importExport
        .importSavedObjects as any).mock.calls[0];

      expect(firstImportCallOptions).toMatchObject({
        namespace: 'a-space',
      });

      const [secondImportCallOptions] = (legacyAPI.savedObjects.importExport
        .importSavedObjects as any).mock.calls[1];

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

      const { resolveConflicts, legacyAPI } = await setup();

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      await resolveConflicts.routeHandler(mockRouteContext, request, kibanaResponseFactory);

      expect(legacyAPI.savedObjects.getScopedSavedObjectsClient).toHaveBeenCalledWith(
        expect.any(Object),
        {
          excludedWrappers: ['spaces'],
        }
      );
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
        resolveConflicts.routeValidation.body!.validate(payload)
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
        resolveConflicts.routeValidation.body!.validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[retries.key(\\"invalid-space-id!@#$%^&*()\\")]: Invalid space id: invalid-space-id!@#$%^&*()"`
      );
    });

    it('does not allow namespace agnostic types to be copied (via "supportedTypes" property)', async () => {
      const payload = {
        retries: {
          ['a-space']: [
            {
              type: 'visualization',
              id: 'bar',
              overwrite: true,
            },
            {
              type: 'globalType',
              id: 'bar',
              overwrite: true,
            },
          ],
        },
        objects: [
          {
            type: 'globalType',
            id: 'bar',
          },
          { type: 'visualization', id: 'bar' },
        ],
      };

      const { resolveConflicts, legacyAPI } = await setup();

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
      expect(legacyAPI.savedObjects.importExport.resolveImportErrors).toHaveBeenCalledTimes(1);
      const [resolveImportErrorsCallOptions] = (legacyAPI.savedObjects.importExport
        .resolveImportErrors as any).mock.calls[0];

      expect(resolveImportErrorsCallOptions).toMatchObject({
        namespace: 'a-space',
        supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
      });
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

      const { resolveConflicts, legacyAPI } = await setup();

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
      expect(legacyAPI.savedObjects.importExport.resolveImportErrors).toHaveBeenCalledTimes(2);
      const [resolveImportErrorsFirstCallOptions] = (legacyAPI.savedObjects.importExport
        .resolveImportErrors as any).mock.calls[0];

      expect(resolveImportErrorsFirstCallOptions).toMatchObject({
        namespace: 'a-space',
        supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
      });

      const [resolveImportErrorsSecondCallOptions] = (legacyAPI.savedObjects.importExport
        .resolveImportErrors as any).mock.calls[1];

      expect(resolveImportErrorsSecondCallOptions).toMatchObject({
        namespace: 'b-space',
        supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
      });
    });
  });
});
