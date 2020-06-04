/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SecurityAuditLogger } from './security_audit_logger';

const createMockAuditLogger = () => {
  return {
    log: jest.fn(),
  };
};

describe(`#savedObjectsAuthorizationFailure`, () => {
  test('logs via auditLogger', () => {
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SecurityAuditLogger(auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';
    const types = ['foo-type-1', 'foo-type-2'];
    const spaceIds = ['foo-space', 'bar-space'];
    const missing = [
      {
        spaceId: 'foo-space',
        privilege: `saved_object:${types[0]}/${action}`,
      },
      {
        spaceId: 'foo-space',
        privilege: `saved_object:${types[1]}/${action}`,
      },
    ];
    const args = {
      foo: 'bar',
      baz: 'quz',
    };

    securityAuditLogger.savedObjectsAuthorizationFailure(
      username,
      action,
      types,
      spaceIds,
      missing,
      args
    );

    expect(auditLogger.log).toHaveBeenCalledWith(
      'saved_objects_authorization_failure',
      expect.any(String),
      {
        username,
        action,
        types,
        spaceIds,
        missing,
        args,
      }
    );
    expect(auditLogger.log.mock.calls[0][1]).toMatchInlineSnapshot(
      `"foo-user unauthorized to [foo-action] [foo-type-1,foo-type-2] in [foo-space,bar-space]: missing [(foo-space)saved_object:foo-type-1/foo-action,(foo-space)saved_object:foo-type-2/foo-action]"`
    );
  });
});

describe(`#savedObjectsAuthorizationSuccess`, () => {
  test('logs via auditLogger', () => {
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SecurityAuditLogger(auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';
    const types = ['foo-type-1', 'foo-type-2'];
    const spaceIds = ['foo-space', 'bar-space'];
    const args = {
      foo: 'bar',
      baz: 'quz',
    };

    securityAuditLogger.savedObjectsAuthorizationSuccess(username, action, types, spaceIds, args);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'saved_objects_authorization_success',
      expect.any(String),
      {
        username,
        action,
        types,
        spaceIds,
        args,
      }
    );
    expect(auditLogger.log.mock.calls[0][1]).toMatchInlineSnapshot(
      `"foo-user authorized to [foo-action] [foo-type-1,foo-type-2] in [foo-space,bar-space]"`
    );
  });
});

describe(`#accessAgreementAcknowledged`, () => {
  test('logs via auditLogger', () => {
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SecurityAuditLogger(auditLogger);
    const username = 'foo-user';
    const provider = { type: 'saml', name: 'saml1' };

    securityAuditLogger.accessAgreementAcknowledged(username, provider);

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith(
      'access_agreement_acknowledged',
      'foo-user acknowledged access agreement (saml/saml1).',
      { username, provider }
    );
  });
});
