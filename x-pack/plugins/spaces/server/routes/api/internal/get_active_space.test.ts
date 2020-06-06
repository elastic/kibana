/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import { mockRouteContextWithInvalidLicense } from '../__fixtures__';
import { CoreSetup, kibanaResponseFactory } from 'src/core/server';
import { httpServiceMock, httpServerMock, coreMock } from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { spacesConfig } from '../../../lib/__fixtures__';
import { initGetActiveSpaceApi } from './get_active_space';

describe('GET /internal/spaces/_active_space', () => {
  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpServiceMock.createRouter();

    const coreStart = coreMock.createStart();

    const service = new SpacesService(null as any);
    const spacesService = await service.setup({
      http: (httpService as unknown) as CoreSetup['http'],
      getStartServices: async () => [coreStart, {}, {}],
      authorization: null,
      auditLogger: {} as SpacesAuditLogger,
      config$: Rx.of(spacesConfig),
    });

    initGetActiveSpaceApi({
      internalRouter: router,
      spacesService,
    });

    return {
      routeHandler: router.get.mock.calls[0][1],
    };
  };

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
