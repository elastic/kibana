/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsAuthorizationAuditLogger } from './audit_logger';

const createActionsAuthorizationAuditLoggerMock = () => {
  const mocked = {
    getAuthorizationMessage: jest.fn(),
    actionsAuthorizationFailure: jest.fn(),
    actionsAuthorizationSuccess: jest.fn(),
  } as unknown as jest.Mocked<ActionsAuthorizationAuditLogger>;
  return mocked;
};

export const actionsAuthorizationAuditLoggerMock: {
  create: () => jest.Mocked<ActionsAuthorizationAuditLogger>;
} = {
  create: createActionsAuthorizationAuditLoggerMock,
};
