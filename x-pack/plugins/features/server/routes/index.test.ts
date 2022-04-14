/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureRegistry } from '../feature_registry';
import { defineRoutes } from './index';

import { httpServerMock, httpServiceMock, coreMock } from '../../../../../src/core/server/mocks';
import { LicenseType } from '../../../licensing/server/';
import { licensingMock } from '../../../licensing/server/mocks';
import { RequestHandler } from '../../../../../src/core/server';
import { FeatureKibanaPrivileges, KibanaFeatureConfig, SubFeatureConfig } from '../../common';

function createContextMock(licenseType: LicenseType = 'platinum') {
  return {
    core: Promise.resolve(coreMock.createRequestHandlerContext()),
    licensing: Promise.resolve(
      licensingMock.createRequestHandlerContext({ license: { type: licenseType } })
    ),
  };
}

function createPrivilege(partial: Partial<FeatureKibanaPrivileges> = {}): FeatureKibanaPrivileges {
  return {
    savedObject: {
      all: [],
      read: [],
    },
    ui: [],
    ...partial,
  };
}

function getExpectedSubFeatures(licenseType: LicenseType = 'platinum'): SubFeatureConfig[] {
  return [
    {
      name: 'basicFeature',
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'basicSub1',
              name: 'basic sub 1',
              includeIn: 'all',
              ...createPrivilege(),
            },
          ],
        },
      ],
    },
    {
      name: 'platinumFeature',
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges:
            licenseType !== 'basic'
              ? [
                  {
                    id: 'platinumFeatureSub1',
                    name: 'platinum sub 1',
                    includeIn: 'all',
                    minimumLicense: 'platinum',
                    ...createPrivilege(),
                  },
                ]
              : [],
        },
        {
          groupType: 'mutually_exclusive',
          privileges: [
            {
              id: 'platinumFeatureMutExSub1',
              name: 'platinum sub 1',
              includeIn: 'all',
              ...createPrivilege(),
            },
          ],
        },
      ],
    },
  ];
}

describe('GET /api/features', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeEach(() => {
    const featureRegistry = new FeatureRegistry();
    featureRegistry.registerKibanaFeature({
      id: 'feature_1',
      name: 'Feature 1',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: createPrivilege(),
        read: createPrivilege(),
      },
      subFeatures: getExpectedSubFeatures(),
    });

    featureRegistry.registerKibanaFeature({
      id: 'feature_2',
      name: 'Feature 2',
      order: 2,
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: null,
    });

    featureRegistry.registerKibanaFeature({
      id: 'feature_3',
      name: 'Feature 2',
      order: 1,
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: null,
    });

    featureRegistry.registerKibanaFeature({
      id: 'licensed_feature',
      name: 'Licensed Feature',
      app: ['bar-app'],
      category: { id: 'foo', label: 'foo' },
      minimumLicense: 'gold',
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
    await routeHandler(createContextMock(), { query: {} } as any, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body as KibanaFeatureConfig[];

    const features = body.map((feature) => ({
      id: feature.id,
      order: feature.order,
      subFeatures: feature.subFeatures,
    }));

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
        subFeatures: getExpectedSubFeatures(),
      },
      {
        id: 'licensed_feature',
        order: undefined,
      },
    ]);
  });

  it(`by default does not return features that arent allowed by current license`, async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler(createContextMock('basic'), { query: {} } as any, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body as KibanaFeatureConfig[];

    const features = body.map((feature) => ({
      id: feature.id,
      order: feature.order,
      subFeatures: feature.subFeatures,
    }));

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
        subFeatures: getExpectedSubFeatures('basic'),
      },
    ]);
  });

  it(`ignoreValidLicenses=false does not return features that arent allowed by current license`, async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler(
      createContextMock('basic'),
      { query: { ignoreValidLicenses: false } } as any,
      mockResponse
    );

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body as KibanaFeatureConfig[];

    const features = body.map((feature) => ({
      id: feature.id,
      order: feature.order,
      subFeatures: feature.subFeatures,
    }));

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
        subFeatures: getExpectedSubFeatures('basic'),
      },
    ]);
  });

  it(`ignoreValidLicenses=true returns features that arent allowed by current license`, async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler(
      createContextMock('basic'),
      { query: { ignoreValidLicenses: true } } as any,
      mockResponse
    );

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body as KibanaFeatureConfig[];

    const features = body.map((feature) => ({
      id: feature.id,
      order: feature.order,
      subFeatures: feature.subFeatures,
    }));

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
        subFeatures: getExpectedSubFeatures(),
      },
      {
        id: 'licensed_feature',
        order: undefined,
      },
    ]);
  });
});
