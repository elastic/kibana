/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectsAuditLogger } from './encrypted_saved_objects_audit_logger';

test('properly logs audit events when audit logs are enabled', () => {
  const mockInternalAuditLogger = { log: jest.fn() };
  const audit = new EncryptedSavedObjectsAuditLogger(true, mockInternalAuditLogger);

  audit.encryptAttributesSuccess(['one', 'two'], 'known-type', 'object-id');
  audit.decryptAttributesSuccess(['three', 'four'], 'known-type-1', 'object-id-1');
  audit.encryptAttributeFailure('five', 'known-type-2', 'object-id-2');
  audit.decryptAttributeFailure('six', 'known-type-3', 'object-id-3');

  expect(mockInternalAuditLogger.log).toHaveBeenCalledTimes(4);
  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'encrypt_success',
    'Successfully encrypted attributes "[one,two]" for saved object "known-type:object-id".',
    { id: 'object-id', type: 'known-type', attributesNames: ['one', 'two'] }
  );
  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'decrypt_success',
    'Successfully decrypted attributes "[three,four]" for saved object "known-type-1:object-id-1".',
    { id: 'object-id-1', type: 'known-type-1', attributesNames: ['three', 'four'] }
  );
  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'encrypt_failure',
    'Failed to encrypt attribute "five" for saved object "known-type-2:object-id-2".',
    { id: 'object-id-2', type: 'known-type-2', attributeName: 'five' }
  );
  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'decrypt_failure',
    'Failed to decrypt attribute "six" for saved object "known-type-3:object-id-3".',
    { id: 'object-id-3', type: 'known-type-3', attributeName: 'six' }
  );
});

test('does not log audit events when audit logs are disabled', () => {
  const mockInternalAuditLogger = { log: jest.fn() };
  const audit = new EncryptedSavedObjectsAuditLogger(false, mockInternalAuditLogger);

  audit.encryptAttributesSuccess(['one', 'two'], 'known-type', 'object-id');
  audit.decryptAttributesSuccess(['three', 'four'], 'known-type-1', 'object-id-1');
  audit.encryptAttributeFailure('five', 'known-type-2', 'object-id-2');
  audit.decryptAttributeFailure('six', 'known-type-3', 'object-id-3');

  expect(mockInternalAuditLogger.log).not.toHaveBeenCalled();
});
