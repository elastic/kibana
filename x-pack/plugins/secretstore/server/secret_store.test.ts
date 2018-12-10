/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Iron from 'iron';
import { SecretStore } from './secret_store';

describe('The Secret Secret Store', function TestSecretStoreObject() {
  const subject = new SecretStore();
  it('should be secretive', async () => {
    const hideMe = { message: 'secret message' };
    const hidden = await subject.hide(hideMe);
    expect(hidden).not.toBeNull();
    expect(hidden.message).not.toBeDefined();
  });

  it('should return the secret message when asked', async () => {
    const hideMe = { message: 'secret message' };
    const hidden = await subject.hide(hideMe);
    const unhidden = await subject.unhide(hidden);
    expect(unhidden.message).toEqual(hideMe.message);
  });

  it('should not be unhiddable', async () => {
    const hideMe = { message: 'my secret message' };
    const hidden = await subject.hide(hideMe);
    try {
      await Iron.unseal(hidden, 'somepasssomepasssomepasssomepass', Iron.defaults);
      fail('We should always expect this password to not work');
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });

  it('should not expose the password field', () => {
    const field = 'password';
    const sameSubject: any = subject;
    expect(sameSubject[field]).toBeUndefined();
  });

  it('should not allow objects hidden from different stores to be unhiddable', async () => {
    const storeOne = new SecretStore();
    const storeTwo = new SecretStore();
    const hideMe = { message: 'a very secret message' };
    const storeOneHidden = await storeOne.hide(hideMe);
    try {
      await storeTwo.unhide(storeOneHidden);
      fail('Stores should have different hidden details');
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });
});
