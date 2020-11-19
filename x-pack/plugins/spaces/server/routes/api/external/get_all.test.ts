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
import { CoreSetup, kibanaResponseFactory } from 'src/core/server';
import {
  loggingSystemMock,
  httpServiceMock,
  httpServerMock,
  coreMock,
} from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { SpacesClient } from '../../../lib/spaces_client';
import { initGetAllSpacesApi } from './get_all';
import { spacesConfig } from '../../../lib/__fixtures__';
import { securityMock } from '../../../../../security/server/mocks';

describe('GET /spaces/space', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map((s) => ({ id: s.id, ...s.attributes }));

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    const coreStart = coreMock.createStart();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const log = loggingSystemMock.create().get('spaces');

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

    initGetAllSpacesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      getImportExportObjectLimit: () => 1000,
      log,
      spacesService,
      authorization: null, // not needed for this route
    });

    return {
      routeHandler: router.get.mock.calls[0][1],
    };
  };

  [undefined, 'any', 'copySavedObjectsIntoSpace', 'shareSavedObjectsIntoSpace'].forEach(
    (purpose) => {
      describe(`with purpose='${purpose}'`, () => {
        it(`returns expected result when not specifying include_authorized_purposes`, async () => {
          const { routeHandler } = await setup();

          const request = httpServerMock.createKibanaRequest({ method: 'get', query: { purpose } });
          const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

          expect(response.status).toEqual(200);
          expect(response.payload).toEqual(spaces);
        });

        it(`returns expected result when specifying include_authorized_purposes=true`, async () => {
          const { routeHandler } = await setup();

          const request = httpServerMock.createKibanaRequest({
            method: 'get',
            query: { purpose, include_authorized_purposes: true },
          });
          const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

          if (purpose === undefined) {
            expect(response.status).toEqual(200);
            expect(response.payload).toEqual(spaces);
          } else {
            expect(response.status).toEqual(400);
            expect(response.payload).toEqual(
              new Error(`'purpose' cannot be supplied with 'includeAuthorizedPurposes'`)
            );
          }
        });

        it(`returns expected result when specifying include_authorized_purposes=false`, async () => {
          const { routeHandler } = await setup();

          const request = httpServerMock.createKibanaRequest({
            method: 'get',
            query: { purpose, include_authorized_purposes: false },
          });
          const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

          expect(response.status).toEqual(200);
          expect(response.payload).toEqual(spaces);
        });
      });
    }
  );

  it(`returns http/403 when the license is invalid`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
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
});
