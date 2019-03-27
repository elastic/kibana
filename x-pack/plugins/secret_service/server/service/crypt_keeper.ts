/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import hash from 'object-hash';

export function buildCrypt(encryptionKey: string) {
  const {
    ALGO = 'aes-256-gcm',
    SALT_LEN = 64,
    IV_LEN = 12,
    KEY_LEN = 32,
    TAG_LEN = 16,
    CYCLES = 100000,
    DIGEST = 'sha256',
    ENC = 'base64',
  } = {};

  return {
    encrypt: (unencrypted: any, aad: any) => {
      const salt = crypto.randomBytes(SALT_LEN);
      const iv = crypto.randomBytes(IV_LEN);
      const encKey = crypto.pbkdf2Sync(encryptionKey, salt, CYCLES, KEY_LEN, DIGEST);

      const cipher = crypto.createCipheriv(ALGO, encKey, iv, {
        authTagLength: TAG_LEN,
      });

      cipher.setAAD(Buffer.from(hash(aad), 'hex'));

      const encrypted = Buffer.concat([cipher.update(JSON.stringify(unencrypted)), cipher.final()]);
      const tag = cipher.getAuthTag();

      return Buffer.concat([tag, iv, salt, encrypted]).toString(ENC);
    },
    decrypt: (encrypted: string, aad: any) => {
      const buffer = Buffer.from(encrypted, ENC);
      const tag = buffer.slice(0, TAG_LEN);
      const iv = buffer.slice(TAG_LEN, TAG_LEN + IV_LEN);
      const salt = buffer.slice(TAG_LEN + IV_LEN, TAG_LEN + IV_LEN + SALT_LEN);
      const data = buffer.slice(TAG_LEN + IV_LEN + SALT_LEN);

      const decryptKey = crypto.pbkdf2Sync(encryptionKey, salt, CYCLES, KEY_LEN, DIGEST);

      const decipher = crypto.createDecipheriv(ALGO, decryptKey, iv);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from(hash(aad), 'hex'));

      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    },
  };
}
