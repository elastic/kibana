/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptionError } from './encryption_error';

test('#EncryptionError is correctly constructed', () => {
  const cause = new TypeError('Some weird error');
  const encryptionError = new EncryptionError(
    'Unable to encrypt attribute "someAttr"',
    'someAttr',
    cause
  );

  expect(encryptionError).toBeInstanceOf(EncryptionError);
  expect(encryptionError.message).toBe('Unable to encrypt attribute "someAttr"');
  expect(encryptionError.attributeName).toBe('someAttr');
  expect(encryptionError.cause).toBe(cause);
});
