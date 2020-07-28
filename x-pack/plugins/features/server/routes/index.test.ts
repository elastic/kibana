/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureRegistry } from '../feature_registry';
import { defineRoutes } from './index';

import { httpServerMock, httpServiceMock, coreMock } from '../../../../../src/core/server/mocks';
import { LicenseType } from '../../../licensing/server/';
import { licensingMock } from '../../../licensing/server/mocks';
import { RequestHandler } from '../../../../../src/core/server';
import { FeatureConfig } from '../../common';

function createContextMock(licenseType: LicenseType = 'gold') {
  return {
    core: coreMock.createRequestHandlerContext(),
    licensing: licensingMock.createRequestHandlerContext({ license: { type: licenseType } }),
  };
}

describe('GET /api/features', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeEach(() => {
    const featureRegistry = new FeatureRegistry();
    featureRegistry.register({
      id: 'feature_1',
      name: 'Feature 1',
      app: [],
      privileges: null,
    });

    featureRegistry.register({
      id: 'feature_2',
      name: 'Feature 2',
      order: 2,
      app: [],
      privileges: null,
    });

    featureRegistry.register({
      id: 'feature_3',
      name: 'Feature 2',
      order: 1,
      app: [],
      privileges: null,
    });

    featureRegistry.register({
      id: 'licensed_feature',
      name: 'Licensed Feature',
      app: ['bar-app'],
      validLicenses: ['gold'],
      privileges: null,
    });

    const routerMock = httpServiceMock.createRouter();
    defineRoutes({
      router: routerMock,
      featureRegistry,
    });

    routeHandler = routerMock.get.mock.calls[0][1];
  });

  it('returns a list of available features, sorted by their configured order', async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    routeHandler(createContextMock(), { query: {} } as any, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body as FeatureConfig[];

    const features = body.map((feature) => ({ id: feature.id, order: feature.order }));
    expect(features).toEqual([
      {
        id: 'feature_3',
        order: 1,
      },
      {
        id: 'feature_2',
        order: 2,
      },
      {
        id: 'feature_1',
        order: undefined,
      },
      {
        id: 'licensed_feature',
        order: undefined,
      },
    ]);
  });

  it(`by default does not return features that arent allowed by current license`, async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    routeHandler(createContextMock('basic'), { query: {} } as any, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body as FeatureConfig[];

    const features = body.map((feature) => ({ id: feature.id, order: feature.order }));

    expect(features).toEqual([
      {
        id: 'feature_3',
        order: 1,
      },
      {
        id: 'feature_2',
        order: 2,
      },
      {
        id: 'feature_1',
        order: undefined,
      },
    ]);
  });

  it(`ignoreValidLicenses=false does not return features that arent allowed by current license`, async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    routeHandler(
      createContextMock('basic'),
      { query: { ignoreValidLicenses: false } } as any,
      mockResponse
    );

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body as FeatureConfig[];

    const features = body.map((feature) => ({ id: feature.id, order: feature.order }));

    expect(features).toEqual([
      {
        id: 'feature_3',
        order: 1,
      },
      {
        id: 'feature_2',
        order: 2,
      },
      {
        id: 'feature_1',
        order: undefined,
      },
    ]);
  });

  it(`ignoreValidLicenses=true returns features that arent allowed by current license`, async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    routeHandler(
      createContextMock('basic'),
      { query: { ignoreValidLicenses: true } } as any,
      mockResponse
    );

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body as FeatureConfig[];

    const features = body.map((feature) => ({ id: feature.id, order: feature.order }));

    expect(features).toEqual([
      {
        id: 'feature_3',
        order: 1,
      },
      {
        id: 'feature_2',
        order: 2,
      },
      {
        id: 'feature_1',
        order: undefined,
      },
      {
        id: 'licensed_feature',
        order: undefined,
      },
    ]);
  });
});
