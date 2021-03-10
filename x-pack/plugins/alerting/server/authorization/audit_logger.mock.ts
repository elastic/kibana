/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsAuthorizationAuditLogger } from './audit_logger';

const createAlertsAuthorizationAuditLoggerMock = () => {
  const mocked = ({
    getAuthorizationMessage: jest.fn(),
    alertsAuthorizationFailure: jest.fn(),
    alertsUnscopedAuthorizationFailure: jest.fn(),
    alertsAuthorizationSuccess: jest.fn(),
    alertsBulkAuthorizationSuccess: jest.fn(),
  } as unknown) as jest.Mocked<AlertsAuthorizationAuditLogger>;
  return mocked;
};

export const alertsAuthorizationAuditLoggerMock: {
  create: () => jest.Mocked<AlertsAuthorizationAuditLogger>;
} = {
  create: createAlertsAuthorizationAuditLoggerMock,
};
