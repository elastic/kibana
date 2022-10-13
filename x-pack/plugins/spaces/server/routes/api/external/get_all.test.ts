/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { ObjectType } from '@kbn/config-schema';
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
  createSpaces,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';
import { initGetAllSpacesApi } from './get_all';

describe('GET /spaces/space', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map((s) => ({ id: s.id, ...s.attributes }));

  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    const coreStart = coreMock.createStart();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const log = loggingSystemMock.create().get('spaces');

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

    initGetAllSpacesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      log,
      getSpacesService: () => spacesServiceStart,
      usageStatsServicePromise,
    });

    return {
      routeConfig: router.get.mock.calls[0][0],
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
          const { routeConfig, routeHandler } = await setup();

          const request = httpServerMock.createKibanaRequest({
            method: 'get',
            query: { purpose, include_authorized_purposes: true },
          });

          if (routeConfig.validate === false) {
            throw new Error('Test setup failure. Expected route validation');
          }
          const queryParamsValidation = routeConfig.validate.query! as ObjectType<any>;

          const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

          if (purpose === undefined) {
            expect(() => queryParamsValidation.validate(request.query)).not.toThrow();
            expect(response.status).toEqual(200);
            expect(response.payload).toEqual(spaces);
          } else {
            expect(() => queryParamsValidation.validate(request.query)).toThrowError(
              '[include_authorized_purposes]: expected value to equal [false]'
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
