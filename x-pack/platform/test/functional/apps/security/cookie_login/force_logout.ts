/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { security } = getPageObjects(['security']);
  const browser = getService('browser');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('forceLogout', function () {
    it('invalidates the cookie-login session on the server', async () => {
      await security.login();

      const sidCookie = (await browser.getCookies()).find(({ name }) => name === 'sid');
      if (!sidCookie?.value) {
        throw new Error('Expected a session cookie after cookie login');
      }
      const savedSid = sidCookie.value;
      const requestWithSavedSid = () =>
        supertestWithoutAuth
          .get('/internal/security/me')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', `sid=${savedSid}`);

      await requestWithSavedSid().expect(200);
      await security.forceLogout();
      await requestWithSavedSid().expect(401);
    });
  });
}
