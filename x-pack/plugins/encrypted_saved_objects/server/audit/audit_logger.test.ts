/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectsAuditLogger } from './audit_logger';

test('properly logs audit events', () => {
  const mockInternalAuditLogger = { log: jest.fn() };
  const audit = new EncryptedSavedObjectsAuditLogger(() => mockInternalAuditLogger);

  audit.encryptAttributesSuccess(['one', 'two'], {
    type: 'known-type',
    id: 'object-id',
  });
  audit.encryptAttributesSuccess(['one', 'two'], {
    type: 'known-type-ns',
    id: 'object-id-ns',
    namespace: 'object-ns',
  });

  audit.decryptAttributesSuccess(['three', 'four'], {
    type: 'known-type-1',
    id: 'object-id-1',
  });
  audit.decryptAttributesSuccess(['three', 'four'], {
    type: 'known-type-1-ns',
    id: 'object-id-1-ns',
    namespace: 'object-ns',
  });

  audit.encryptAttributeFailure('five', {
    type: 'known-type-2',
    id: 'object-id-2',
  });
  audit.encryptAttributeFailure('five', {
    type: 'known-type-2-ns',
    id: 'object-id-2-ns',
    namespace: 'object-ns',
  });

  audit.decryptAttributeFailure('six', {
    type: 'known-type-3',
    id: 'object-id-3',
  });
  audit.decryptAttributeFailure('six', {
    type: 'known-type-3-ns',
    id: 'object-id-3-ns',
    namespace: 'object-ns',
  });

  expect(mockInternalAuditLogger.log).toHaveBeenCalledTimes(8);
  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'encrypt_success',
    'Successfully encrypted attributes "[one,two]" for saved object "[known-type,object-id]".',
    { id: 'object-id', type: 'known-type', attributesNames: ['one', 'two'] }
  );
  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'encrypt_success',
    'Successfully encrypted attributes "[one,two]" for saved object "[object-ns,known-type-ns,object-id-ns]".',
    {
      id: 'object-id-ns',
      type: 'known-type-ns',
      namespace: 'object-ns',
      attributesNames: ['one', 'two'],
    }
  );

  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'decrypt_success',
    'Successfully decrypted attributes "[three,four]" for saved object "[known-type-1,object-id-1]".',
    { id: 'object-id-1', type: 'known-type-1', attributesNames: ['three', 'four'] }
  );
  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'decrypt_success',
    'Successfully decrypted attributes "[three,four]" for saved object "[object-ns,known-type-1-ns,object-id-1-ns]".',
    {
      id: 'object-id-1-ns',
      type: 'known-type-1-ns',
      namespace: 'object-ns',
      attributesNames: ['three', 'four'],
    }
  );

  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'encrypt_failure',
    'Failed to encrypt attribute "five" for saved object "[known-type-2,object-id-2]".',
    { id: 'object-id-2', type: 'known-type-2', attributeName: 'five' }
  );
  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'encrypt_failure',
    'Failed to encrypt attribute "five" for saved object "[object-ns,known-type-2-ns,object-id-2-ns]".',
    { id: 'object-id-2-ns', type: 'known-type-2-ns', namespace: 'object-ns', attributeName: 'five' }
  );

  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'decrypt_failure',
    'Failed to decrypt attribute "six" for saved object "[known-type-3,object-id-3]".',
    { id: 'object-id-3', type: 'known-type-3', attributeName: 'six' }
  );
  expect(mockInternalAuditLogger.log).toHaveBeenCalledWith(
    'decrypt_failure',
    'Failed to decrypt attribute "six" for saved object "[object-ns,known-type-3-ns,object-id-3-ns]".',
    { id: 'object-id-3-ns', type: 'known-type-3-ns', namespace: 'object-ns', attributeName: 'six' }
  );
});
