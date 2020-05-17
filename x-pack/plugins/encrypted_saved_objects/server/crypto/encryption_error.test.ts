/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptionError, EncryptionErrorOperation } from './encryption_error';

test('#EncryptionError is correctly constructed', () => {
  const cause = new TypeError('Some weird error');
  const encryptionError = new EncryptionError(
    'Unable to encrypt attribute "someAttr"',
    'someAttr',
    EncryptionErrorOperation.Encryption,
    cause
  );

  expect(encryptionError).toBeInstanceOf(EncryptionError);
  expect(encryptionError.message).toBe('Unable to encrypt attribute "someAttr"');
  expect(encryptionError.attributeName).toBe('someAttr');
  expect(encryptionError.operation).toBe(EncryptionErrorOperation.Encryption);
  expect(encryptionError.cause).toBe(cause);
  expect(JSON.stringify(encryptionError)).toMatchInlineSnapshot(
    `"{\\"message\\":\\"Unable to encrypt attribute \\\\\\"someAttr\\\\\\"\\"}"`
  );

  const decryptionErrorWithoutCause = new EncryptionError(
    'Unable to decrypt attribute "someAttr"',
    'someAttr',
    EncryptionErrorOperation.Decryption
  );

  expect(decryptionErrorWithoutCause).toBeInstanceOf(EncryptionError);
  expect(decryptionErrorWithoutCause.message).toBe('Unable to decrypt attribute "someAttr"');
  expect(decryptionErrorWithoutCause.attributeName).toBe('someAttr');
  expect(decryptionErrorWithoutCause.operation).toBe(EncryptionErrorOperation.Decryption);
  expect(decryptionErrorWithoutCause.cause).toBeUndefined();
  expect(JSON.stringify(decryptionErrorWithoutCause)).toMatchInlineSnapshot(
    `"{\\"message\\":\\"Unable to decrypt attribute \\\\\\"someAttr\\\\\\"\\"}"`
  );
});
