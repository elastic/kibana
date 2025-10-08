/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { parse } from 'url';

import expect from '@kbn/expect';
import { SESSION_ERROR_REASON_HEADER } from '@kbn/security-plugin/common/constants';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const deployment = getService('deployment');
  const PageObjects = getPageObjects(['security', 'common']);

  describe('Basic functionality', function () {
    this.tags('includeFirefox');

    before(async () => {
      await PageObjects.security.forceLogout();
    });

    afterEach(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
    });

    it('should attach msg=SESSION_EXPIRED to the redirect URL when redirecting to /login if the session has expired when trying to access a page', async () => {
      await login();

      // Kibana will log the user out automatically 5 seconds before the `xpack.security.session.idleTimeout` timeout.
      // To simulate what will happen if this doesn't happen, navigate to a non-Kibana URL to ensure Kibana isn't running in the browser.
      await browser.get('data:,');

      // Sessions expire based on the `xpack.security.session.idleTimeout` config and is 10s in this test
      await setTimeoutAsync(11000);

      await PageObjects.common.navigateToUrl('home', '', {
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
      });

      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/login');

      expect(await PageObjects.security.loginPage.getInfoMessage()).to.be(
        'Your session has timed out. Please log in again.'
      );
    });

    it(`should handle returned ${SESSION_ERROR_REASON_HEADER} header when the server response is 401`, async () => {
      // TODO: Even though the anonymous path is registered as anonymous, we're still redirected to the `/login` page. So for now I can't test the base case and have to trust that this works as intented
      // await goToAnonymousPath();

      // // First verify that without being logged in, we get the expected result if requesting a protected API
      // const notAuthenticatedFailure = await fetchProtectedAPI();
      // expect(notAuthenticatedFailure.statusCode).to.be(??);
      // expect(notAuthenticatedFailure.reason).to.be(??);

      await login();

      await goToAnonymousPath();

      // Test that, even though we're now on a page that doesn't require
      // authentication, that we can request an API that does and that our
      // session allows us to.
      const success = await fetchProtectedAPI();
      expect(success.statusCode).to.be(200);
      expect(success.reason).to.be(null);

      // Sessions expire based on the `xpack.security.session.idleTimeout`
      // config and is 10s in this test
      await setTimeoutAsync(11000);

      // After the session should have expired, the API should now return
      // accordingly
      const failure = await fetchProtectedAPI();
      expect(failure.statusCode).to.be(401);
      expect(failure.reason).to.be('SESSION_EXPIRED');

      // Navigate to a page that doesn't require authentication, so that the
      // timer which normally would log the user out 5 seconds before their
      // session expires, isn't scheduled.
      async function goToAnonymousPath() {
        await browser.get(`${deployment.getHostPort()}/app/expired_session_test`);
        const currentURL = parse(await browser.getCurrentUrl());
        expect(currentURL.pathname).to.eql('/app/expired_session_test');
      }

      async function fetchProtectedAPI() {
        // Ensure we're on the expected page and haven't, for instance, been
        // logged out and redirected to `/login`. If we're not on this page,
        // getting `window.kibanaFetch` later on will not work.
        const currentURL = parse(await browser.getCurrentUrl());
        expect(currentURL.pathname).to.eql('/app/expired_session_test');

        // Exectue an AJAX request from within the browser to the Kibana server
        // and return the result
        return await browser.execute(async () => {
          let response;

          try {
            const kibanaFetch = await getKibanaFetch();
            const result = await kibanaFetch('/internal/security/me', {
              asResponse: true, // if `false` we would just get the body of the request
            });
            response = result.response;
          } catch (err) {
            // We expect kibanaFetch to throw when it gets a 401 response, so
            // in that case, this `catch` block is actually the "happy" path.
            // However, if the thrown error looks different from what we
            // expect, then re-throw it.
            if (err.response === undefined) {
              throw err;
            }
            response = err.response;
          }

          return {
            statusCode: response.status,
            reason: response.headers.get('kbn-session-error-reason'),
          };

          async function getKibanaFetch() {
            // In our test-Kibana-plugin, we store the custom Kibana fetch
            // function on the `window` object as a hack so we can access it
            // from here.
            const kibanaFetch = (window as any).kibanaFetch;
            if (kibanaFetch === undefined) {
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve(getKibanaFetch());
                }, 10);
              });
            }
            return kibanaFetch;
          }
        });
      }
    });
  });

  async function login() {
    await browser.get(`${deployment.getHostPort()}/login`);
    await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
    await PageObjects.security.loginSelector.login('basic', 'basic1');
  }
}
