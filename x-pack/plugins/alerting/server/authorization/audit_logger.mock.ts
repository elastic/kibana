/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingAuthorizationAuditLogger } from './audit_logger';

const createAlertingAuthorizationAuditLoggerMock = () => {
  const mocked = {
    getAuthorizationMessage: jest.fn(),
    logAuthorizationFailure: jest.fn(),
    logUnscopedAuthorizationFailure: jest.fn(),
    logAuthorizationSuccess: jest.fn(),
    logBulkAuthorizationSuccess: jest.fn(),
  } as unknown as jest.Mocked<AlertingAuthorizationAuditLogger>;
  return mocked;
};

export const alertingAuthorizationAuditLoggerMock: {
  create: () => jest.Mocked<AlertingAuthorizationAuditLogger>;
} = {
  create: createAlertingAuthorizationAuditLoggerMock,
};
