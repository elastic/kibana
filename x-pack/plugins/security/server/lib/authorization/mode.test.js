/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authorizationModeFactory } from './mode';

const createMockConfig = (settings) => {
  const mockConfig = {
    get: jest.fn()
  };

  mockConfig.get.mockImplementation(key => {
    return settings[key];
  });

  return mockConfig;
};

const createMockXpackInfoFeature = (allowRbac) => {
  return {
    getLicenseCheckResults() {
      return {
        allowRbac
      };
    }
  };
};

describe(`#initialize`, () => {
  test(`actually initializes the authorization mode`, () => {
    expect(false).toBe(true);
  });

  test(`can't be initialized twice for the same request`, async () => {
    const mockConfig = createMockConfig();
    const mockXpackInfoFeature = createMockXpackInfoFeature();
    const mode = authorizationModeFactory({}, {}, mockConfig, {}, {}, mockXpackInfoFeature);
    const request = {};

    await mode.initialize(request);
    expect(mode.initialize(request)).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe(`#useRbacForRequest`, () => {
  test(`return false if not initialized for request`, async () => {
    const mockConfig = createMockConfig();
    const mockXpackInfoFeature = createMockXpackInfoFeature();
    const mode = authorizationModeFactory({}, {}, mockConfig, {}, {}, mockXpackInfoFeature);
    const request = {};

    const result = mode.useRbacForRequest(request);
    expect(result).toBe(false);
  });

  test(`returns true if legacy fallback is disabled`, async () => {
    const mockConfig = createMockConfig({
      'xpack.security.authorization.legacyFallback.enabled': false,
    });
    const mockXpackInfoFeature = createMockXpackInfoFeature();
    const mode = authorizationModeFactory({}, {}, mockConfig, {}, {}, mockXpackInfoFeature);
    const request = {};

    await mode.initialize(request);
    const result = mode.useRbacForRequest(request);
    expect(result).toBe(true);
  });
});
