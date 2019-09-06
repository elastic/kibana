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

let currentLicenseLevel: string = 'gold';

describe('GET /api/features', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeEach(() => {
    const featureRegistry = new FeatureRegistry();
    featureRegistry.register({
      id: 'feature_1',
      name: 'Feature 1',
      app: [],
      privileges: {},
    });

    featureRegistry.register({
      id: 'licensed_feature',
      name: 'Licensed Feature',
      app: ['bar-app'],
      validLicenses: ['gold'],
      privileges: {},
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

  it('returns a list of available features', async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    routeHandler(undefined as any, undefined as any, mockResponse);

    expect(mockResponse.ok.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                Object {
                  "body": Array [
                    Object {
                      "app": Array [],
                      "id": "feature_1",
                      "name": "Feature 1",
                      "privileges": Object {},
                    },
                    Object {
                      "app": Array [
                        "bar-app",
                      ],
                      "id": "licensed_feature",
                      "name": "Licensed Feature",
                      "privileges": Object {},
                      "validLicenses": Array [
                        "gold",
                      ],
                    },
                  ],
                },
              ],
            ]
        `);
  });

  it(`does not return features that arent allowed by current license`, async () => {
    currentLicenseLevel = 'basic';

    const mockResponse = httpServerMock.createResponseFactory();
    routeHandler(undefined as any, undefined as any, mockResponse);

    expect(mockResponse.ok.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "body": Array [
              Object {
                "app": Array [],
                "id": "feature_1",
                "name": "Feature 1",
                "privileges": Object {},
              },
            ],
          },
        ],
      ]
    `);
  });
});
