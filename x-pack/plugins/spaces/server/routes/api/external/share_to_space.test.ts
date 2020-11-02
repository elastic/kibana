/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import {
  createSpaces,
  createMockSavedObjectsRepository,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
  createMockSavedObjectsService,
} from '../__fixtures__';
import { CoreSetup, kibanaResponseFactory, RouteValidatorConfig } from 'src/core/server';
import {
  loggingSystemMock,
  httpServiceMock,
  httpServerMock,
  coreMock,
} from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { SpacesClient } from '../../../lib/spaces_client';
import { initShareToSpacesApi } from './share_to_space';
import { spacesConfig } from '../../../lib/__fixtures__';
import { securityMock } from '../../../../../security/server/mocks';
import { ObjectType } from '@kbn/config-schema';
import { SecurityPluginSetup } from '../../../../../security/server';

describe('share to space', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map((s) => ({ id: s.id, ...s.attributes }));

  const setup = async ({
    authorization = null,
  }: { authorization?: SecurityPluginSetup['authz'] | null } = {}) => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();
    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);
    const log = loggingSystemMock.create().get('spaces');
    const coreStart = coreMock.createStart();
    const { savedObjects, savedObjectsClient } = createMockSavedObjectsService(spaces);
    coreStart.savedObjects = savedObjects;

    const service = new SpacesService(log);
    const spacesService = await service.setup({
      http: (httpService as unknown) as CoreSetup['http'],
      getStartServices: async () => [coreStart, {}, {}],
      authorization,
      auditLogger: {} as SpacesAuditLogger,
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

    initShareToSpacesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      getImportExportObjectLimit: () => 1000,
      log,
      spacesService,
      authorization,
    });

    const [
      [shareAdd, ctsRouteHandler],
      [shareRemove, resolveRouteHandler],
    ] = router.post.mock.calls;

    const [[, permissionsRouteHandler]] = router.get.mock.calls;

    return {
      coreStart,
      savedObjectsClient,
      shareAdd: {
        routeValidation: shareAdd.validate as RouteValidatorConfig<{}, {}, {}>,
        routeHandler: ctsRouteHandler,
      },
      shareRemove: {
        routeValidation: shareRemove.validate as RouteValidatorConfig<{}, {}, {}>,
        routeHandler: resolveRouteHandler,
      },
      sharePermissions: {
        routeHandler: permissionsRouteHandler,
      },
      savedObjectsRepositoryMock,
    };
  };

  describe('GET /internal/spaces/_share_saved_object_permissions', () => {
    it('returns true when security is not enabled', async () => {
      const { sharePermissions } = await setup();

      const request = httpServerMock.createKibanaRequest({ query: { type: 'foo' }, method: 'get' });
      const response = await sharePermissions.routeHandler(
        mockRouteContext,
        request,
        kibanaResponseFactory
      );

      const { status, payload } = response;
      expect(status).toEqual(200);
      expect(payload).toEqual({ shareToAllSpaces: true });
    });

    it('returns false when the user is not authorized globally', async () => {
      const authorization = securityMock.createSetup().authz;
      const globalPrivilegesCheck = jest.fn().mockResolvedValue({ hasAllRequested: false });
      authorization.checkPrivilegesWithRequest.mockReturnValue({
        globally: globalPrivilegesCheck,
      });
      const { sharePermissions } = await setup({ authorization });

      const request = httpServerMock.createKibanaRequest({ query: { type: 'foo' }, method: 'get' });
      const response = await sharePermissions.routeHandler(
        mockRouteContext,
        request,
        kibanaResponseFactory
      );

      const { status, payload } = response;
      expect(status).toEqual(200);
      expect(payload).toEqual({ shareToAllSpaces: false });

      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
    });

    it('returns true when the user is authorized globally', async () => {
      const authorization = securityMock.createSetup().authz;
      const globalPrivilegesCheck = jest.fn().mockResolvedValue({ hasAllRequested: true });
      authorization.checkPrivilegesWithRequest.mockReturnValue({
        globally: globalPrivilegesCheck,
      });
      const { sharePermissions } = await setup({ authorization });

      const request = httpServerMock.createKibanaRequest({ query: { type: 'foo' }, method: 'get' });
      const response = await sharePermissions.routeHandler(
        mockRouteContext,
        request,
        kibanaResponseFactory
      );

      const { status, payload } = response;
      expect(status).toEqual(200);
      expect(payload).toEqual({ shareToAllSpaces: true });

      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
    });
  });

  describe('POST /api/spaces/_share_saved_object_add', () => {
    const object = { id: 'foo', type: 'bar' };

    it(`returns http/403 when the license is invalid`, async () => {
      const { shareAdd } = await setup();

      const request = httpServerMock.createKibanaRequest({ method: 'post' });
      const response = await shareAdd.routeHandler(
        mockRouteContextWithInvalidLicense,
        request,
        kibanaResponseFactory
      );

      expect(response.status).toEqual(403);
      expect(response.payload).toEqual({
        message: 'License is invalid for spaces',
      });
    });

    it(`requires at least 1 space ID`, async () => {
      const { shareAdd } = await setup();
      const payload = { spaces: [], object };

      expect(() =>
        (shareAdd.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(`"[spaces]: must specify one or more space ids"`);
    });

    it(`requires space IDs to be unique`, async () => {
      const { shareAdd } = await setup();
      const payload = { spaces: ['a-space', 'a-space'], object };

      expect(() =>
        (shareAdd.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(`"[spaces]: duplicate space ids are not allowed"`);
    });

    it(`requires well-formed space IDS`, async () => {
      const { shareAdd } = await setup();
      const payload = { spaces: ['a-space', 'a-space-invalid-!@#$%^&*()'], object };

      expect(() =>
        (shareAdd.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[spaces.1]: lower case, a-z, 0-9, \\"_\\", and \\"-\\" are allowed, OR \\"*\\""`
      );
    });

    it(`allows all spaces ("*")`, async () => {
      const { shareAdd } = await setup();
      const payload = { spaces: ['*'], object };

      expect(() =>
        (shareAdd.routeValidation.body as ObjectType).validate(payload)
      ).not.toThrowError();
    });

    it('adds the object to the specified space(s)', async () => {
      const { shareAdd, savedObjectsClient } = await setup();
      const payload = { spaces: ['a-space', 'b-space'], object };

      const request = httpServerMock.createKibanaRequest({ body: payload, method: 'post' });
      const response = await shareAdd.routeHandler(
        mockRouteContext,
        request,
        kibanaResponseFactory
      );

      const { status } = response;
      expect(status).toEqual(204);
      expect(savedObjectsClient.addToNamespaces).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.addToNamespaces).toHaveBeenCalledWith(
        payload.object.type,
        payload.object.id,
        payload.spaces
      );
    });
  });

  describe('POST /api/spaces/_share_saved_object_remove', () => {
    const object = { id: 'foo', type: 'bar' };

    it(`returns http/403 when the license is invalid`, async () => {
      const { shareRemove } = await setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
      });

      const response = await shareRemove.routeHandler(
        mockRouteContextWithInvalidLicense,
        request,
        kibanaResponseFactory
      );

      expect(response.status).toEqual(403);
      expect(response.payload).toEqual({
        message: 'License is invalid for spaces',
      });
    });

    it(`requires at least 1 space ID`, async () => {
      const { shareRemove } = await setup();
      const payload = { spaces: [], object };

      expect(() =>
        (shareRemove.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(`"[spaces]: must specify one or more space ids"`);
    });

    it(`requires space IDs to be unique`, async () => {
      const { shareRemove } = await setup();
      const payload = { spaces: ['a-space', 'a-space'], object };

      expect(() =>
        (shareRemove.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(`"[spaces]: duplicate space ids are not allowed"`);
    });

    it(`requires well-formed space IDS`, async () => {
      const { shareRemove } = await setup();
      const payload = { spaces: ['a-space', 'a-space-invalid-!@#$%^&*()'], object };

      expect(() =>
        (shareRemove.routeValidation.body as ObjectType).validate(payload)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[spaces.1]: lower case, a-z, 0-9, \\"_\\", and \\"-\\" are allowed, OR \\"*\\""`
      );
    });

    it(`allows all spaces ("*")`, async () => {
      const { shareRemove } = await setup();
      const payload = { spaces: ['*'], object };

      expect(() =>
        (shareRemove.routeValidation.body as ObjectType).validate(payload)
      ).not.toThrowError();
    });

    it('removes the object from the specified space(s)', async () => {
      const { shareRemove, savedObjectsClient } = await setup();
      const payload = { spaces: ['a-space', 'b-space'], object };

      const request = httpServerMock.createKibanaRequest({ body: payload, method: 'post' });
      const response = await shareRemove.routeHandler(
        mockRouteContext,
        request,
        kibanaResponseFactory
      );

      const { status } = response;
      expect(status).toEqual(204);
      expect(savedObjectsClient.deleteFromNamespaces).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.deleteFromNamespaces).toHaveBeenCalledWith(
        payload.object.type,
        payload.object.id,
        payload.spaces
      );
    });
  });
});
