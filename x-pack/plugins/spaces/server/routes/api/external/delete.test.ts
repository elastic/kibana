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
import { CoreSetup, IRouter, kibanaResponseFactory, RouteValidatorConfig } from 'src/core/server';
import {
  loggingServiceMock,
  elasticsearchServiceMock,
  httpServiceMock,
  httpServerMock,
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

    initDeleteSpacesApi({
      externalRouter: router,
      getSavedObjects: () => legacyAPI.savedObjects,
      log,
      spacesService,
    });

    const [routeDefinition, routeHandler] = router.delete.mock.calls[0];

    return {
      routeValidation: routeDefinition.validate as RouteValidatorConfig<{}, {}, {}>,
      routeHandler,
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
