/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticsearchServiceMock, loggingServiceMock } from 'src/core/server/mocks';
import { getEnabledRoleMappingsFeatures } from './get_enabled_role_mappings_features';

describe('getEnabledRoleMappingsFeatures', () => {
  // Most scenarios are covered in the `feature_check.test.ts` suite, so will not be repeated here

  it('falls back to allowing both script types if there is an error retrieving node settings', async () => {
    const clusterClient = elasticsearchServiceMock.createClusterClient();
    const loggingService = loggingServiceMock.create();
    const logger = loggingService.get();

    clusterClient.callAsInternalUser.mockRejectedValue(new Error('something drastic happened'));

    const result = await getEnabledRoleMappingsFeatures({ clusterClient, logger });
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledTimes(2);
    expect(clusterClient.callAsInternalUser.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "transport.request",
          Object {
            "method": "GET",
            "path": "/_nodes/settings?filter_path=nodes.*.settings.script",
          },
        ],
        Array [
          "transport.request",
          Object {
            "method": "GET",
            "path": "/_xpack/usage",
          },
        ],
      ]
    `);

    expect(result).toEqual({
      canUseInlineScripts: true,
      canUseStoredScripts: true,
      hasCompatibleRealms: false,
    });
  });
});
