/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import crypto from 'crypto';
import { SecretStore } from './secret_store';

describe('The Secret Secret Store', function TestSecretStoreObject() {
  const subject = new SecretStore(crypto.randomBytes(32));

  it('should not expose the key field', () => {
    const field = 'key';
    const sameSubject: any = subject;
    expect(sameSubject[field]).toBeUndefined();
  });

  it('should hide values', () => {
    const hideMe = { message: 'my secret message', nonSecret: 'this is unhidden' };
    const hidden = subject.hide(hideMe);
    expect(hidden).toBeDefined();
    expect(hidden).not.toContain('my secret message');
    expect(subject);
  });

  it('should be able to unhide values', () => {
    const hideMe = {
      message: 'my secret message',
      nonSecret: 'this is unhidden',
      someOtherProp: 'check me',
    };
    const hidden = subject.hide(hideMe);
    const unhidden = subject.unhide(hidden);
    expect(unhidden).toMatchObject(hideMe);
  });

  it('should be different each time encrypted', () => {
    const hideMe = {
      secretMessage: 'this is my secret message',
    };
    const hidden = subject.hide(hideMe);
    const hidden2 = subject.hide(hideMe);
    expect(hidden).not.toEqual(hidden2);
  });

  it('should throw an error if there was a problem unhiding', () => {
    expect(() => {
      subject.unhide("blahblahI'mnotencrypted");
    }).toThrowError('SecretStore Decrypt Failed: Invalid IV length');
  });

  it('should throw an error if there was a problem hiding', () => {
    expect(() => {
      const unparsable = { me: {} };
      unparsable.me = unparsable;
      subject.hide(unparsable);
    }).toThrowError();
  });
});
