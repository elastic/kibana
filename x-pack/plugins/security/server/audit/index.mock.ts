/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityAuditLogger } from './security_audit_logger';
import { AuditService } from './audit_service';

export const securityAuditLoggerMock = {
  create() {
    return ({
      savedObjectsAuthorizationFailure: jest.fn(),
      savedObjectsAuthorizationSuccess: jest.fn(),
      accessAgreementAcknowledged: jest.fn(),
    } as unknown) as jest.Mocked<SecurityAuditLogger>;
  },
};

export const auditServiceMock = {
  create() {
    return {
      getLogger: jest.fn(),
    } as jest.Mocked<ReturnType<AuditService['setup']>>;
  },
};
