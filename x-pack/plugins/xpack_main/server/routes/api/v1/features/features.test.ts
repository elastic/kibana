/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import {
  getFeatures,
  registerFeature,
} from 'x-pack/plugins/xpack_main/server/lib/feature_registry';
// @ts-ignore
import { setupXPackMain } from '../../../../lib/setup_xpack_main';
import { featuresRoute } from './features';

let server: Server;
let currentLicenseLevel: string = 'gold';

describe('GET /api/features/v1', () => {
  beforeAll(() => {
    server = new Server();

    const config: Record<string, any> = {};
    server.config = () => {
      return {
        get: (key: string) => {
          return config[key];
        },
      };
    };
    // @ts-ignore
    server.plugins.xpack_main = {
      getFeatures,
      info: {
        license: {
          isOneOf: (candidateLicenses: string[]) => {
            return candidateLicenses.includes(currentLicenseLevel);
          },
        },
      },
    };

    featuresRoute(server);

    registerFeature({
      id: 'feature_1',
      name: 'Feature 1',
      privileges: {},
    });

    registerFeature({
      id: 'licensed_feature',
      name: 'Licensed Feature',
      validLicenses: ['gold'],
      privileges: {},
    });
  });

  it('returns a list of available features', async () => {
    const response = await server.inject({
      url: '/api/features/v1',
    });

    expect(response.statusCode).toEqual(200);
    expect(JSON.parse(response.payload)).toMatchSnapshot();
  });

  it(`does not return features that arent allowed by current license`, async () => {
    currentLicenseLevel = 'basic';

    const response = await server.inject({
      url: '/api/features/v1',
    });

    expect(response.statusCode).toEqual(200);
    expect(JSON.parse(response.payload)).toMatchSnapshot();
  });
});
