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

const createMockLogger = () => jest.fn();

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
  test(`can't be initialized twice for the same request`, async () => {
    const mockConfig = createMockConfig();
    const mockLogger = createMockLogger();
    const mockXpackInfoFeature = createMockXpackInfoFeature();
    const mode = authorizationModeFactory({}, {}, mockConfig, mockLogger, {}, {}, mockXpackInfoFeature);
    const request = {};

    await mode.initialize(request);
    expect(mockLogger).not.toHaveBeenCalled();
    await mode.initialize(request);
    expect(mockLogger).toHaveBeenCalledWith(['security', 'debug'], `Authorization mode is already initialized`);
  });
});

describe(`#useRbacForRequest`, () => {
  test(`return false if not initialized for request`, async () => {
    const mockConfig = createMockConfig();
    const mockLogger = createMockLogger();
    const mockXpackInfoFeature = createMockXpackInfoFeature();
    const mode = authorizationModeFactory({}, {}, mockConfig, mockLogger, {}, {}, mockXpackInfoFeature);
    const request = {};

    const result = mode.useRbacForRequest(request);
    expect(result).toBe(false);
    expect(mockLogger).not.toHaveBeenCalled();
  });

  test(`returns true if legacy fallback is disabled`, async () => {
    const mockConfig = createMockConfig({
      'xpack.security.authorization.legacyFallback.enabled': false,
    });
    const mockLogger = createMockLogger();
    const mockXpackInfoFeature = createMockXpackInfoFeature();
    const mode = authorizationModeFactory({}, {}, mockConfig, mockLogger, {}, {}, mockXpackInfoFeature);
    const request = {};

    await mode.initialize(request);
    const result = mode.useRbacForRequest(request);
    expect(result).toBe(true);
    expect(mockLogger).not.toHaveBeenCalled();
  });
});
