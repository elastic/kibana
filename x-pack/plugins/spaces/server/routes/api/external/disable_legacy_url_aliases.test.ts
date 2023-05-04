/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

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
  createMockSavedObjectsRepository,
  createSpaces,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';
import { initDisableLegacyUrlAliasesApi } from './disable_legacy_url_aliases';

describe('_disable_legacy_url_aliases', () => {
  const spacesSavedObjects = createSpaces();

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

    const usageStatsClient = usageStatsClientMock.create();
    const usageStatsServicePromise = Promise.resolve(
      usageStatsServiceMock.createSetupContract(usageStatsClient)
    );

    const clientServiceStart = clientService.start(coreStart);

    const spacesServiceStart = service.start({
      basePath: coreStart.http.basePath,
      spacesClientService: clientServiceStart,
    });

    initDisableLegacyUrlAliasesApi({
      externalRouter: router,
      getStartServices: async () => [coreStart, {}, {}],
      log,
      getSpacesService: () => spacesServiceStart,
      usageStatsServicePromise,
    });

    const [routeDefinition, routeHandler] = router.post.mock.calls[0];

    return {
      routeValidation: routeDefinition.validate as RouteValidatorConfig<{}, {}, {}>,
      routeHandler,
      savedObjectsRepositoryMock,
      usageStatsClient,
    };
  };

  it('records usageStats data', async () => {
    const payload = {
      aliases: [{ targetSpace: 'space-1', targetType: 'type-1', sourceId: 'id-1' }],
    };

    const { routeHandler, usageStatsClient } = await setup();

    const request = httpServerMock.createKibanaRequest({
      body: payload,
      method: 'post',
    });

    await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(usageStatsClient.incrementDisableLegacyUrlAliases).toHaveBeenCalled();
  });

  it('should disable the provided aliases', async () => {
    const payload = {
      aliases: [{ targetSpace: 'space-1', targetType: 'type-1', sourceId: 'id-1' }],
    };

    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(204);
    expect(savedObjectsRepositoryMock.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.bulkUpdate).toHaveBeenCalledWith([
      { type: 'legacy-url-alias', id: 'space-1:type-1:id-1', attributes: { disabled: true } },
    ]);
  });

  it(`returns http/403 when the license is invalid`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
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
