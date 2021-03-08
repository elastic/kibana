/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nodeCrypto from '@elastic/node-crypto';

export function cryptoFactory(encryptionKey?: string) {
  if (typeof encryptionKey !== 'string') {
    throw new Error('Encryption Key required.');
  }

  return nodeCrypto({ encryptionKey });
}
