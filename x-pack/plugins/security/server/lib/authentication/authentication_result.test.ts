/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuthenticationResult } from './authentication_result';

describe('AuthenticationResult', () => {
  describe('notHandled', () => {
    it('correctly produces `notHandled` authentication result.', () => {
      const authenticationResult = AuthenticationResult.notHandled();

      expect(authenticationResult.notHandled()).toBe(true);
      expect(authenticationResult.succeeded()).toBe(false);
      expect(authenticationResult.failed()).toBe(false);
      expect(authenticationResult.redirected()).toBe(false);

      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toBeUndefined();
      expect(authenticationResult.redirectURL).toBeUndefined();
    });
  });

  describe('failed', () => {
    it('fails if error is not specified.', () => {
      expect(() => AuthenticationResult.failed(undefined as any)).toThrowError(
        'Error should be specified.'
      );
    });

    it('correctly produces `failed` authentication result.', () => {
      const failureReason = new Error('Something went wrong.');
      const authenticationResult = AuthenticationResult.failed(failureReason);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.notHandled()).toBe(false);
      expect(authenticationResult.succeeded()).toBe(false);
      expect(authenticationResult.redirected()).toBe(false);

      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.redirectURL).toBeUndefined();
    });
  });

  describe('succeeded', () => {
    it('fails if user is not specified.', () => {
      expect(() => AuthenticationResult.succeeded(undefined as any)).toThrowError(
        'User should be specified.'
      );
    });

    it('correctly produces `succeeded` authentication result without state.', () => {
      const user = { username: 'user' };
      const authenticationResult = AuthenticationResult.succeeded(user);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.failed()).toBe(false);
      expect(authenticationResult.notHandled()).toBe(false);
      expect(authenticationResult.redirected()).toBe(false);

      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toBeUndefined();
      expect(authenticationResult.redirectURL).toBeUndefined();
    });

    it('correctly produces `succeeded` authentication result with state.', () => {
      const user = { username: 'user' };
      const state = { some: 'state' };
      const authenticationResult = AuthenticationResult.succeeded(user, state);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.failed()).toBe(false);
      expect(authenticationResult.notHandled()).toBe(false);
      expect(authenticationResult.redirected()).toBe(false);

      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBe(state);
      expect(authenticationResult.error).toBeUndefined();
      expect(authenticationResult.redirectURL).toBeUndefined();
    });
  });

  describe('redirectTo', () => {
    it('fails if redirect URL is not specified.', () => {
      expect(() => AuthenticationResult.redirectTo(undefined as any)).toThrowError(
        'Redirect URL must be specified.'
      );
    });

    it('correctly produces `redirected` authentication result without state.', () => {
      const redirectURL = '/redirect/url';
      const authenticationResult = AuthenticationResult.redirectTo(redirectURL);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.succeeded()).toBe(false);
      expect(authenticationResult.failed()).toBe(false);
      expect(authenticationResult.notHandled()).toBe(false);

      expect(authenticationResult.redirectURL).toBe(redirectURL);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toBeUndefined();
    });

    it('correctly produces `redirected` authentication result with state.', () => {
      const redirectURL = '/redirect/url';
      const state = { some: 'state' };
      const authenticationResult = AuthenticationResult.redirectTo(redirectURL, state);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.succeeded()).toBe(false);
      expect(authenticationResult.failed()).toBe(false);
      expect(authenticationResult.notHandled()).toBe(false);

      expect(authenticationResult.redirectURL).toBe(redirectURL);
      expect(authenticationResult.state).toBe(state);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.error).toBeUndefined();
    });
  });
});
