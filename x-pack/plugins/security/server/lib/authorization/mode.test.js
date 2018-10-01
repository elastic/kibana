/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authorizationModeFactory } from './mode';

const application = 'kibana-.kibana';

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

const createMockShieldClient = (getUserPrivilegesResponse) => ({
  callWithRequest: jest.fn().mockReturnValue(getUserPrivilegesResponse)
});

describe(`#initialize`, () => {
  test(`can't be initialized twice for the same request`, async () => {
    const mockConfig = createMockConfig();
    const mockXpackInfoFeature = createMockXpackInfoFeature();
    const mode = authorizationModeFactory(application, mockConfig, null, mockXpackInfoFeature);
    const request = {};

    await mode.initialize(request);
    expect(mode.initialize(request)).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe(`#useRbacForRequest`, () => {
  test(`return false if not initialized for request`, async () => {
    const mockConfig = createMockConfig();
    const mockXpackInfoFeature = createMockXpackInfoFeature();
    const mode = authorizationModeFactory(application, mockConfig, null, mockXpackInfoFeature);
    const request = {};

    const result = mode.useRbacForRequest(request);
    expect(result).toBe(false);
  });

  test(`returns true if legacy fallback is disabled`, async () => {
    const mockConfig = createMockConfig({
      'xpack.security.authorization.legacyFallback.enabled': false,
    });
    const mockXpackInfoFeature = createMockXpackInfoFeature(true);
    const mode = authorizationModeFactory(application, mockConfig, null, mockXpackInfoFeature);
    const request = {};

    await mode.initialize(request);
    const result = mode.useRbacForRequest(request);
    expect(result).toBe(true);
  });

  test(`returns false if xpackInfoFeature.getLicenseCheckResults().allowRbac is false`, async () => {
    const mockConfig = createMockConfig({
      'xpack.security.authorization.legacyFallback.enabled': true,
    });
    const mockXpackInfoFeature = createMockXpackInfoFeature(false);
    const mode = authorizationModeFactory(application, mockConfig, null, mockXpackInfoFeature);
    const request = {};

    await mode.initialize(request);
    const result = mode.useRbacForRequest(request);
    expect(result).toBe(false);
  });

  test(`returns false if shieldClient getUserPrivileges returns no applications`, async () => {
    const mockConfig = createMockConfig({
      'xpack.security.authorization.legacyFallback.enabled': true,
    });
    const mockXpackInfoFeature = createMockXpackInfoFeature(true);
    const mockShieldClient = createMockShieldClient({
      applications: []
    });
    const mode = authorizationModeFactory(application, mockConfig, mockShieldClient, mockXpackInfoFeature);
    const request = {
      headers: {
        foo: 'bar'
      }
    };

    await mode.initialize(request);
    const result = mode.useRbacForRequest(request);
    expect(result).toBe(false);
    expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.getUserPrivileges');
  });

  test(`returns false if shieldClient getUserPrivileges returns incorrect application`, async () => {
    const mockConfig = createMockConfig({
      'xpack.security.authorization.legacyFallback.enabled': true,
    });
    const mockXpackInfoFeature = createMockXpackInfoFeature(true);
    const mockShieldClient = createMockShieldClient({
      applications: [{
        application: 'kibana-.kibana-marketing'
      }]
    });
    const mode = authorizationModeFactory(application, mockConfig, mockShieldClient, mockXpackInfoFeature);
    const request = {
      headers: {
        foo: 'bar'
      }
    };

    await mode.initialize(request);
    const result = mode.useRbacForRequest(request);
    expect(result).toBe(false);
    expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.getUserPrivileges');
  });

  test(`returns true if shieldClient getUserPrivileges returns * and incorrect application`, async () => {
    const mockConfig = createMockConfig({
      'xpack.security.authorization.legacyFallback.enabled': true,
    });
    const mockXpackInfoFeature = createMockXpackInfoFeature(true);
    const mockShieldClient = createMockShieldClient({
      applications: [{
        application: 'kibana-.kibana-marketing'
      }, {
        application: '*'
      }]
    });
    const mode = authorizationModeFactory(application, mockConfig, mockShieldClient, mockXpackInfoFeature);
    const request = {
      headers: {
        foo: 'bar'
      }
    };

    await mode.initialize(request);
    const result = mode.useRbacForRequest(request);
    expect(result).toBe(true);
    expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.getUserPrivileges');
  });

  test(`returns true if shieldClient getUserPrivileges returns matching application and incorrect application`, async () => {
    const mockConfig = createMockConfig({
      'xpack.security.authorization.legacyFallback.enabled': true,
    });
    const mockXpackInfoFeature = createMockXpackInfoFeature(true);
    const mockShieldClient = createMockShieldClient({
      applications: [{
        application: 'kibana-.kibana-marketing'
      }, {
        application
      }]
    });
    const mode = authorizationModeFactory(application, mockConfig, mockShieldClient, mockXpackInfoFeature);
    const request = {
      headers: {
        foo: 'bar'
      }
    };

    await mode.initialize(request);
    const result = mode.useRbacForRequest(request);
    expect(result).toBe(true);
    expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(request, 'shield.getUserPrivileges');
  });
});
