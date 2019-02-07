/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { buildCrypt } from './crypt_keeper';

describe('CryptKeeper', () => {
  describe('Same object', () => {
    const keeper = buildCrypt({ key: crypto.randomBytes(128) });
    it('should encrypt things', () => {
      const encrypted = keeper.encrypt(
        { message: 'some super secret data to keep safe' },
        {
          extra: 'me unique',
        }
      );
      expect(encrypted).not.toHaveProperty('message');
      expect(encrypted).not.toEqual('some super secret data to keep safe');
    });

    it('should decrypt things', () => {
      const encrypted = keeper.encrypt(
        { message: 'some super secret data to keep safe' },
        {
          extra: 'me unique',
        }
      );
      const decrypted = keeper.decrypt(encrypted, { extra: 'me unique' });
      expect(decrypted.message).toBeDefined();
      expect(decrypted.message).toEqual('some super secret data to keep safe');
    });

    it('should throw an error if it cannot decrypt something', () => {
      const encrypted = keeper.encrypt({ message: 'secrets' }, { extra: 'me unique' });

      expect(() => {
        const decrypted = keeper.decrypt(encrypted, {});
        expect(decrypted).toBeUndefined();
      }).toThrowError();

      expect(() => {
        const decrypted = keeper.decrypt(encrypted, { extra: 'me unique not' });
        expect(decrypted).toBeUndefined();
      }).toThrowError();

      expect(() => {
        const decrypted = keeper.decrypt(encrypted, { extra: 'me unique', not: '' });
        expect(decrypted).toBeUndefined();
      }).toThrowError();
    });
  });
});
