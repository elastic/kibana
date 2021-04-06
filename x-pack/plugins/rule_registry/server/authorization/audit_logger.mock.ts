/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RacAuthorizationAuditLogger } from './audit_logger';

const createRacAuthorizationAuditLoggerMock = () => {
  const mocked = ({
    getAuthorizationMessage: jest.fn(),
    racAuthorizationFailure: jest.fn(),
    racUnscopedAuthorizationFailure: jest.fn(),
    racAuthorizationSuccess: jest.fn(),
  } as unknown) as jest.Mocked<RacAuthorizationAuditLogger>;
  return mocked;
};

export const alertsAuthorizationAuditLoggerMock: {
  create: () => jest.Mocked<RacAuthorizationAuditLogger>;
} = {
  create: createRacAuthorizationAuditLoggerMock,
};
