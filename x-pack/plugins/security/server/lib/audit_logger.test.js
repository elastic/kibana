/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SecurityAuditLogger } from './audit_logger';


const createMockConfig = (settings) => {
  const mockConfig = {
    get: jest.fn()
  };

  mockConfig.get.mockImplementation(key => {
    return settings[key];
  });

  return mockConfig;
};

const createMockAuditLogger = () => {
  return {
    log: jest.fn()
  };
};

describe(`#savedObjectsAuthorizationFailure`, () => {
  test(`doesn't log anything when xpack.security.audit.enabled is false`, () => {
    const config = createMockConfig({
      'xpack.security.audit.enabled': false
    });
    const auditLogger = createMockAuditLogger();

    const securityAuditLogger = new SecurityAuditLogger(config, auditLogger);
    securityAuditLogger.savedObjectsAuthorizationFailure();

    expect(auditLogger.log).toHaveBeenCalledTimes(0);
  });

  test('logs via auditLogger when xpack.security.audit.enabled is true', () => {
    const config = createMockConfig({
      'xpack.security.audit.enabled': true
    });
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SecurityAuditLogger(config, auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';
    const types = [ 'foo-type-1', 'foo-type-2' ];
    const missing = [`action:saved_objects/${types[0]}/foo-action`, `action:saved_objects/${types[1]}/foo-action`];
    const args = {
      'foo': 'bar',
      'baz': 'quz',
    };

    securityAuditLogger.savedObjectsAuthorizationFailure(username, action, types, missing, args);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'saved_objects_authorization_failure',
      expect.stringContaining(`${username} unauthorized to ${action}`),
      {
        username,
        action,
        types,
        missing,
        args,
      }
    );
  });
});

describe(`#savedObjectsAuthorizationSuccess`, () => {
  test(`doesn't log anything when xpack.security.audit.enabled is false`, () => {
    const config = createMockConfig({
      'xpack.security.audit.enabled': false
    });
    const auditLogger = createMockAuditLogger();

    const securityAuditLogger = new SecurityAuditLogger(config, auditLogger);
    securityAuditLogger.savedObjectsAuthorizationSuccess();

    expect(auditLogger.log).toHaveBeenCalledTimes(0);
  });

  test('logs via auditLogger when xpack.security.audit.enabled is true', () => {
    const config = createMockConfig({
      'xpack.security.audit.enabled': true
    });
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SecurityAuditLogger(config, auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';
    const types = [ 'foo-type-1', 'foo-type-2' ];
    const args = {
      'foo': 'bar',
      'baz': 'quz',
    };

    securityAuditLogger.savedObjectsAuthorizationSuccess(username, action, types, args);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'saved_objects_authorization_success',
      expect.stringContaining(`${username} authorized to ${action}`),
      {
        username,
        action,
        types,
        args,
      }
    );
  });
});
