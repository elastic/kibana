/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

import { DeauthenticationResult } from '../deauthentication_result';

describe('DeauthenticationResult', () => {
  describe('notHandled', () => {
    it('correctly produces `notHandled` deauthentication result.', () => {
      const deauthenticationResult = DeauthenticationResult.notHandled();

      expect(deauthenticationResult.notHandled()).to.be(true);
      expect(deauthenticationResult.succeeded()).to.be(false);
      expect(deauthenticationResult.failed()).to.be(false);
      expect(deauthenticationResult.redirected()).to.be(false);

      expect(deauthenticationResult.user).to.be(undefined);
      expect(deauthenticationResult.state).to.be(undefined);
      expect(deauthenticationResult.error).to.be(undefined);
      expect(deauthenticationResult.redirectURL).to.be(undefined);
    });
  });

  describe('failed', () => {
    it('fails if error is not specified.', () => {
      expect(() => DeauthenticationResult.failed()).to.throwError('Error should be specified.');
    });

    it('correctly produces `failed` deauthentication result.', () => {
      const failureReason = new Error('Something went wrong.');
      const deauthenticationResult = DeauthenticationResult.failed(failureReason);

      expect(deauthenticationResult.failed()).to.be(true);
      expect(deauthenticationResult.notHandled()).to.be(false);
      expect(deauthenticationResult.succeeded()).to.be(false);
      expect(deauthenticationResult.redirected()).to.be(false);

      expect(deauthenticationResult.error).to.be(failureReason);
      expect(deauthenticationResult.redirectURL).to.be(undefined);
    });
  });

  describe('succeeded', () => {
    it('correctly produces `succeeded` deauthentication result.', () => {
      const deauthenticationResult = DeauthenticationResult.succeeded();

      expect(deauthenticationResult.succeeded()).to.be(true);
      expect(deauthenticationResult.failed()).to.be(false);
      expect(deauthenticationResult.notHandled()).to.be(false);
      expect(deauthenticationResult.redirected()).to.be(false);

      expect(deauthenticationResult.error).to.be(undefined);
      expect(deauthenticationResult.redirectURL).to.be(undefined);
    });
  });

  describe('redirectTo', () => {
    it('fails if redirect URL is not specified.', () => {
      expect(() => DeauthenticationResult.redirectTo()).to.throwError('Redirect URL must be specified.');
    });

    it('correctly produces `redirected` deauthentication result.', () => {
      const redirectURL = '/redirect/url';
      const deauthenticationResult = DeauthenticationResult.redirectTo(redirectURL);

      expect(deauthenticationResult.redirected()).to.be(true);
      expect(deauthenticationResult.succeeded()).to.be(false);
      expect(deauthenticationResult.failed()).to.be(false);
      expect(deauthenticationResult.notHandled()).to.be(false);

      expect(deauthenticationResult.redirectURL).to.be(redirectURL);
      expect(deauthenticationResult.error).to.be(undefined);
    });
  });
});
