/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SecurityAuditLogger } from './audit_logger';

const createMockAuditLogger = () => {
  return {
    log: jest.fn(),
  };
};

describe(`#savedObjectsAuthorizationFailure`, () => {
  test('logs via auditLogger', () => {
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SecurityAuditLogger(() => auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';
    const types = ['foo-type-1', 'foo-type-2'];
    const missing = [`saved_object:${types[0]}/foo-action`, `saved_object:${types[1]}/foo-action`];
    const args = {
      foo: 'bar',
      baz: 'quz',
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
  test('logs via auditLogger when xpack.security.audit.enabled is true', () => {
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SecurityAuditLogger(() => auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';
    const types = ['foo-type-1', 'foo-type-2'];
    const args = {
      foo: 'bar',
      baz: 'quz',
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
