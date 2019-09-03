/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeauthenticationResult } from './deauthentication_result';

describe('DeauthenticationResult', () => {
  describe('notHandled', () => {
    it('correctly produces `notHandled` deauthentication result.', () => {
      const deauthenticationResult = DeauthenticationResult.notHandled();

      expect(deauthenticationResult.notHandled()).toBe(true);
      expect(deauthenticationResult.succeeded()).toBe(false);
      expect(deauthenticationResult.failed()).toBe(false);
      expect(deauthenticationResult.redirected()).toBe(false);

      expect(deauthenticationResult.error).toBeUndefined();
      expect(deauthenticationResult.redirectURL).toBeUndefined();
    });
  });

  describe('failed', () => {
    it('fails if error is not specified.', () => {
      expect(() => DeauthenticationResult.failed(undefined as any)).toThrowError(
        'Error should be specified.'
      );
    });

    it('correctly produces `failed` deauthentication result.', () => {
      const failureReason = new Error('Something went wrong.');
      const deauthenticationResult = DeauthenticationResult.failed(failureReason);

      expect(deauthenticationResult.failed()).toBe(true);
      expect(deauthenticationResult.notHandled()).toBe(false);
      expect(deauthenticationResult.succeeded()).toBe(false);
      expect(deauthenticationResult.redirected()).toBe(false);

      expect(deauthenticationResult.error).toBe(failureReason);
      expect(deauthenticationResult.redirectURL).toBeUndefined();
    });
  });

  describe('succeeded', () => {
    it('correctly produces `succeeded` deauthentication result.', () => {
      const deauthenticationResult = DeauthenticationResult.succeeded();

      expect(deauthenticationResult.succeeded()).toBe(true);
      expect(deauthenticationResult.failed()).toBe(false);
      expect(deauthenticationResult.notHandled()).toBe(false);
      expect(deauthenticationResult.redirected()).toBe(false);

      expect(deauthenticationResult.error).toBeUndefined();
      expect(deauthenticationResult.redirectURL).toBeUndefined();
    });
  });

  describe('redirectTo', () => {
    it('fails if redirect URL is not specified.', () => {
      expect(() => DeauthenticationResult.redirectTo(undefined as any)).toThrowError(
        'Redirect URL must be specified.'
      );
    });

    it('correctly produces `redirected` deauthentication result.', () => {
      const redirectURL = '/redirect/url';
      const deauthenticationResult = DeauthenticationResult.redirectTo(redirectURL);

      expect(deauthenticationResult.redirected()).toBe(true);
      expect(deauthenticationResult.succeeded()).toBe(false);
      expect(deauthenticationResult.failed()).toBe(false);
      expect(deauthenticationResult.notHandled()).toBe(false);

      expect(deauthenticationResult.redirectURL).toBe(redirectURL);
      expect(deauthenticationResult.error).toBeUndefined();
    });
  });
});
