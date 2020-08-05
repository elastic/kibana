/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectsAuditLogger } from './audit_logger';

export const encryptedSavedObjectsAuditLoggerMock = {
  create() {
    return ({
      encryptAttributesSuccess: jest.fn(),
      encryptAttributeFailure: jest.fn(),
      decryptAttributesSuccess: jest.fn(),
      decryptAttributeFailure: jest.fn(),
    } as unknown) as jest.Mocked<EncryptedSavedObjectsAuditLogger>;
  },
};
