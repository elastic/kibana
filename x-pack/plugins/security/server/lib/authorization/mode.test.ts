/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { XPackFeature } from 'x-pack/plugins/xpack_main/xpack_main';
import { authorizationModeFactory } from './mode';

const createMockSecurityXPackFeature = (allowRbac: boolean) => {
  return {
    getLicenseCheckResults() {
      return {
        allowRbac,
      };
    },
  } as XPackFeature;
};

describe(`#useRbac`, () => {
  test(`returns false if xpackInfoFeature.getLicenseCheckResults().allowRbac is false`, async () => {
    const mockXpackInfoFeature = createMockSecurityXPackFeature(false);
    const mode = authorizationModeFactory(mockXpackInfoFeature);

    const result = mode.useRbac();
    expect(result).toBe(false);
  });

  test(`returns true if xpackInfoFeature.getLicenseCheckResults().allowRbac is true`, async () => {
    const mockXpackInfoFeature = createMockSecurityXPackFeature(true);
    const mode = authorizationModeFactory(mockXpackInfoFeature);

    const result = mode.useRbac();
    expect(result).toBe(true);
  });
});
