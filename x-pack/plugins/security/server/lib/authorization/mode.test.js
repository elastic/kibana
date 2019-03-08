/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authorizationModeFactory } from './mode';

const createMockXpackInfoFeature = (allowRbac) => {
  return {
    getLicenseCheckResults() {
      return {
        allowRbac
      };
    }
  };
};

describe(`#useRbac`, () => {
  test(`returns false if xpackInfoFeature.getLicenseCheckResults().allowRbac is false`, async () => {
    const mockXpackInfoFeature = createMockXpackInfoFeature(false);
    const mode = authorizationModeFactory(mockXpackInfoFeature);

    const result = mode.useRbac();
    expect(result).toBe(false);
  });

  test(`returns true if xpackInfoFeature.getLicenseCheckResults().allowRbac is true`, async () => {
    const mockXpackInfoFeature = createMockXpackInfoFeature(true);
    const mode = authorizationModeFactory(mockXpackInfoFeature);

    const result = mode.useRbac();
    expect(result).toBe(true);
  });
});
