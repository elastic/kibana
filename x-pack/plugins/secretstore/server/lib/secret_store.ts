/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { buildCrypt } from './crypt_keeper';

export class SecretStore {
  public readonly hide: (unecryptedData: any) => any;
  public readonly unhide: (encryptedData: any) => any;
  constructor(key?: Buffer) {
    key = key || crypto.randomBytes(128);
    const crypt = buildCrypt({ key: key.toString('hex') });

    this.hide = (unencryptedData: any) => {
      try {
        return crypt.encrypt(unencryptedData);
      } catch (e) {
        throw new Error(`SecretStore Encrypt failed: ${e.message}`);
      }
    };

    this.unhide = (encryptedData: string) => {
      try {
        return crypt.decrypt(encryptedData);
      } catch (e) {
        throw new Error(`SecretStore Decrypt Failed: ${e.message}`);
      }
    };
  }
}
