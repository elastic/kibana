/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureRegistry } from '../feature_registry';
import { defineRoutes } from './index';

import { httpServerMock, httpServiceMock } from '../../../../../src/core/server/mocks';
import { XPackInfoLicense } from '../../../../legacy/plugins/xpack_main/server/lib/xpack_info_license';
import { RequestHandler } from '../../../../../src/core/server';
import { FeatureConfig } from '../../common';

let currentLicenseLevel: string = 'gold';

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
      getLegacyAPI: () => ({
        xpackInfo: {
          license: {
            isOneOf(candidateLicenses: string[]) {
              return candidateLicenses.includes(currentLicenseLevel);
            },
          } as XPackInfoLicense,
        },
        savedObjectTypes: [],
      }),
    });

    routeHandler = routerMock.get.mock.calls[0][1];
  });

  it('returns a list of available features, sorted by their configured order', async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    routeHandler(undefined as any, { query: {} } as any, mockResponse);

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
    currentLicenseLevel = 'basic';

    const mockResponse = httpServerMock.createResponseFactory();
    routeHandler(undefined as any, { query: {} } as any, mockResponse);

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
    currentLicenseLevel = 'basic';

    const mockResponse = httpServerMock.createResponseFactory();
    routeHandler(undefined as any, { query: { ignoreValidLicenses: false } } as any, mockResponse);

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
    currentLicenseLevel = 'basic';

    const mockResponse = httpServerMock.createResponseFactory();
    routeHandler(undefined as any, { query: { ignoreValidLicenses: true } } as any, mockResponse);

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
