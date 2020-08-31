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
  createExportSavedObjectsToStreamMock,
  createImportSavedObjectsFromStreamMock,
  createResolveSavedObjectsImportErrorsMock,
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
import { initCopyToSpacesApi } from './copy_to_space';
import { spacesConfig } from '../../../lib/__fixtures__';
import { securityMock } from '../../../../../security/server/mocks';
import { ObjectType } from '@kbn/config-schema';
jest.mock('../../../../../../../src/core/server', () => {
  return {
    exportSavedObjectsToStream: jest.fn(),
    importSavedObjectsFromStream: jest.fn(),
    resolveSavedObjectsImportErrors: jest.fn(),
    kibanaResponseFactory: jest.requireActual('src/core/server').kibanaResponseFactory,
  };
});
import {
  exportSavedObjectsToStream,
  importSavedObjectsFromStream,
  resolveSavedObjectsImportErrors,
} from '../../../../../../../src/core/server';

describe('copy to space', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map((s) => ({ id: s.id, ...s.attributes }));

  beforeEach(() => {
    (exportSavedObjectsToStream as jest.Mock).mockReset();
    (importSavedObjectsFromStream as jest.Mock).mockReset();
    (resolveSavedObjectsImportErrors as jest.Mock).mockReset();
  });

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    (exportSavedObjectsToStream as jest.Mock).mockImplementation(
      createExportSavedObjectsToStreamMock()
    );
    (importSavedObjectsFromStream as jest.Mock).mockImplementation(
      createImportSavedObjectsFromStreamMock()
    );
    (resolveSavedObjectsImportErrors as jest.Mock).mockImplementation(
      createResolveSavedObjectsImportErrorsMock()
    );

    const log = loggingSystemMock.create().get('spaces');

    const coreStart = coreMock.createStart();
    coreStart.savedObjects = createMockSavedObjectsService(spaces);

    const service = new SpacesService(log);
    const spacesService = await service.setup({
      http: (httpService as unknown) as CoreSetup['http'],
      getStartServices: async () => [coreStart, {}, {}],
      authorization: securityMock.createSetup().authz,
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

    initCopyToSpacesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      getImportExportObjectLimit: () => 1000,
      log,
      spacesService,
    });

    const [
      [ctsRouteDefinition, ctsRouteHandler],
      [resolveRouteDefinition, resolveRouteHandler],
    ] = router.post.mock.calls;

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

      const { copyToSpace } = await setup();

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
      expect(importSavedObjectsFromStream).toHaveBeenCalledTimes(2);
      const [firstImportCallOptions] = (importSavedObjectsFromStream as jest.Mock).mock.calls[0];

      expect(firstImportCallOptions).toMatchObject({
        namespace: 'a-space',
      });

      const [secondImportCallOptions] = (importSavedObjectsFromStream as jest.Mock).mock.calls[1];

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

      const { resolveConflicts } = await setup();

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
      expect(resolveSavedObjectsImportErrors).toHaveBeenCalledTimes(2);
      const [
        resolveImportErrorsFirstCallOptions,
      ] = (resolveSavedObjectsImportErrors as jest.Mock).mock.calls[0];

      expect(resolveImportErrorsFirstCallOptions).toMatchObject({ namespace: 'a-space' });

      const [
        resolveImportErrorsSecondCallOptions,
      ] = (resolveSavedObjectsImportErrors as jest.Mock).mock.calls[1];

      expect(resolveImportErrorsSecondCallOptions).toMatchObject({ namespace: 'b-space' });
    });
  });
});
