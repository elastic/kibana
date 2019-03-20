/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

import { LoginAttempt } from '../login_attempt';

describe('LoginAttempt', () => {
  describe('getCredentials()', () => {
    it('returns null by default', () => {
      const attempt = new LoginAttempt();
      expect(attempt.getCredentials()).to.be(null);
    });

    it('returns a credentials object after credentials are set', () => {
      const attempt = new LoginAttempt();
      attempt.setCredentials('foo', 'bar');
      expect(attempt.getCredentials()).to.eql({ username: 'foo', password: 'bar' });
    });
  });

  describe('setCredentials()', () => {
    it('sets the credentials for this login attempt', () => {
      const attempt = new LoginAttempt();
      attempt.setCredentials('foo', 'bar');
      expect(attempt.getCredentials()).to.eql({ username: 'foo', password: 'bar' });
    });

    it('throws if credentials have already been set', () => {
      const attempt = new LoginAttempt();
      attempt.setCredentials('foo', 'bar');
      expect(() => attempt.setCredentials()).to.throwError('Credentials for login attempt have already been set');
    });
  });
});
