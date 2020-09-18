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
} from '../__fixtures__';
import {
  CoreSetup,
  kibanaResponseFactory,
  RouteValidatorConfig,
  SavedObjectsErrorHelpers,
} from 'src/core/server';
import {
  loggingSystemMock,
  httpServiceMock,
  httpServerMock,
  coreMock,
} from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { SpacesClient } from '../../../lib/spaces_client';
import { initDeleteSpacesApi } from './delete';
import { spacesConfig } from '../../../lib/__fixtures__';
import { securityMock } from '../../../../../security/server/mocks';
import { ObjectType } from '@kbn/config-schema';

describe('Spaces Public API', () => {
  const spacesSavedObjects = createSpaces();

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const log = loggingSystemMock.create().get('spaces');

    const coreStart = coreMock.createStart();

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

    initDeleteSpacesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      getImportExportObjectLimit: () => 1000,
      log,
      spacesService,
    });

    const [routeDefinition, routeHandler] = router.delete.mock.calls[0];

    return {
      routeValidation: routeDefinition.validate as RouteValidatorConfig<{}, {}, {}>,
      routeHandler,
      savedObjectsRepositoryMock,
    };
  };

  it('requires a space id as part of the path', async () => {
    const { routeValidation } = await setup();
    expect(() =>
      (routeValidation.params as ObjectType).validate({})
    ).toThrowErrorMatchingInlineSnapshot(
      `"[id]: expected value of type [string] but got [undefined]"`
    );
  });

  it(`deletes the space`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'a-space',
      },
      method: 'delete',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(204);
  });

  it(`returns http/403 when the license is invalid`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'a-space',
      },
      method: 'delete',
    });

    const response = await routeHandler(
      mockRouteContextWithInvalidLicense,
      request,
      kibanaResponseFactory
    );

    expect(response.status).toEqual(403);
    expect(response.payload).toEqual({
      message: 'License is invalid for spaces',
    });
  });

  it('throws when deleting a non-existent space', async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'not-a-space',
      },
      method: 'delete',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(404);
  });

  it(`returns http/400 when scripts cannot be executed in Elasticsearch`, async () => {
    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'a-space',
      },
      method: 'delete',
    });
    // @ts-ignore
    savedObjectsRepositoryMock.deleteByNamespace.mockRejectedValue(
      SavedObjectsErrorHelpers.decorateEsCannotExecuteScriptError(new Error())
    );
    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status, payload } = response;

    expect(status).toEqual(400);
    expect(payload.message).toEqual('Cannot execute script in Elasticsearch query');
  });

  it(`DELETE spaces/{id}' cannot delete reserved spaces`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'default',
      },
      method: 'delete',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status, payload } = response;

    expect(status).toEqual(400);
    expect(payload.message).toEqual('This Space cannot be deleted because it is reserved.');
  });
});
