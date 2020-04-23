/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityAuditLogger } from './audit_logger';

export const securityAuditLoggerMock = {
  create() {
    return ({
      savedObjectsAuthorizationFailure: jest.fn(),
      savedObjectsAuthorizationSuccess: jest.fn(),
      accessAgreementAcknowledged: jest.fn(),
    } as unknown) as jest.Mocked<SecurityAuditLogger>;
  },
};
