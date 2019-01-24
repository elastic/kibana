/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SpacesAuditLogger } from './audit_logger';

const createMockConfig = (settings: { [key: string]: any } = {}) => {
  const mockConfig = {
    get: jest.fn(),
  };

  mockConfig.get.mockImplementation(key => {
    if (!settings.hasOwnProperty(key)) {
      throw new Error('Undefined key, mock schema error');
    }

    return settings[key];
  });

  return mockConfig;
};

const createMockAuditLogger = () => {
  return {
    log: jest.fn(),
  };
};

describe(`#savedObjectsAuthorizationFailure`, () => {
  test(`doesn't log anything when xpack.security.enabled is false`, () => {
    const config = createMockConfig({
      'xpack.security.enabled': false,
    });
    const auditLogger = createMockAuditLogger();

    const securityAuditLogger = new SpacesAuditLogger(config, auditLogger);
    securityAuditLogger.spacesAuthorizationFailure('foo-user', 'foo-action');

    expect(auditLogger.log).toHaveBeenCalledTimes(0);
  });

  test(`doesn't log anything when xpack.security.audit.enabled is false`, () => {
    const config = createMockConfig({
      'xpack.security.enabled': true,
      'xpack.security.audit.enabled': false,
    });
    const auditLogger = createMockAuditLogger();

    const securityAuditLogger = new SpacesAuditLogger(config, auditLogger);
    securityAuditLogger.spacesAuthorizationFailure('foo-user', 'foo-action');

    expect(auditLogger.log).toHaveBeenCalledTimes(0);
  });

  test('logs with spaceIds via auditLogger when xpack.security.audit.enabled is true', () => {
    const config = createMockConfig({
      'xpack.security.enabled': true,
      'xpack.security.audit.enabled': true,
    });
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SpacesAuditLogger(config, auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';
    const spaceIds = ['foo-space-1', 'foo-space-2'];

    securityAuditLogger.spacesAuthorizationFailure(username, action, spaceIds);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'spaces_authorization_failure',
      expect.stringContaining(`${username} unauthorized to ${action} ${spaceIds.join(',')} spaces`),
      {
        username,
        action,
        spaceIds,
      }
    );
  });

  test('logs without spaceIds via auditLogger when xpack.security.audit.enabled is true', () => {
    const config = createMockConfig({
      'xpack.security.enabled': true,
      'xpack.security.audit.enabled': true,
    });
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SpacesAuditLogger(config, auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';

    securityAuditLogger.spacesAuthorizationFailure(username, action);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'spaces_authorization_failure',
      expect.stringContaining(`${username} unauthorized to ${action} spaces`),
      {
        username,
        action,
      }
    );
  });
});

describe(`#savedObjectsAuthorizationSuccess`, () => {
  test(`doesn't log anything when xpack.security.enabled is false`, () => {
    const config = createMockConfig({
      'xpack.security.enabled': false,
    });
    const auditLogger = createMockAuditLogger();

    const securityAuditLogger = new SpacesAuditLogger(config, auditLogger);
    securityAuditLogger.spacesAuthorizationSuccess('foo-user', 'foo-action');

    expect(auditLogger.log).toHaveBeenCalledTimes(0);
  });

  test(`doesn't log anything when xpack.security.audit.enabled is false`, () => {
    const config = createMockConfig({
      'xpack.security.enabled': true,
      'xpack.security.audit.enabled': false,
    });
    const auditLogger = createMockAuditLogger();

    const securityAuditLogger = new SpacesAuditLogger(config, auditLogger);
    securityAuditLogger.spacesAuthorizationSuccess('foo-user', 'foo-action');

    expect(auditLogger.log).toHaveBeenCalledTimes(0);
  });

  test('logs with spaceIds via auditLogger when xpack.security.audit.enabled is true', () => {
    const config = createMockConfig({
      'xpack.security.enabled': true,
      'xpack.security.audit.enabled': true,
    });
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SpacesAuditLogger(config, auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';
    const spaceIds = ['foo-space-1', 'foo-space-2'];

    securityAuditLogger.spacesAuthorizationSuccess(username, action, spaceIds);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'spaces_authorization_success',
      expect.stringContaining(`${username} authorized to ${action} ${spaceIds.join(',')} spaces`),
      {
        username,
        action,
        spaceIds,
      }
    );
  });

  test('logs without spaceIds via auditLogger when xpack.security.audit.enabled is true', () => {
    const config = createMockConfig({
      'xpack.security.enabled': true,
      'xpack.security.audit.enabled': true,
    });
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SpacesAuditLogger(config, auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';

    securityAuditLogger.spacesAuthorizationSuccess(username, action);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'spaces_authorization_success',
      expect.stringContaining(`${username} authorized to ${action} spaces`),
      {
        username,
        action,
      }
    );
  });
});
