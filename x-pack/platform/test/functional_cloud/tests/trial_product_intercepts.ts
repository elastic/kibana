/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TRIAL_TRIGGER_DEF_ID } from '@kbn/product-intercept-plugin/common/constants';
import type { FtrProviderContext } from '../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  describe('Trial Product Intercept on home screen', () => {
    /**
     * @see config.ts
     */
    const CONFIGURED_TRIAL_INTERCEPT_INTERVAL = 10 * 1000;
    const trialInterceptSelector = `[data-test-subj*="intercept-${TRIAL_TRIGGER_DEF_ID}"]`;

    before(async () => {
      // Create role mapping so user gets superuser access
      await getService('esSupertest')
        .post('/_security/role_mapping/cloud-saml-kibana')
        .send({
          roles: ['superuser'],
          enabled: true,
          rules: { field: { 'realm.name': 'cloud-saml-kibana' } },
        })
        .expect(200);
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToUrl('home');
      // Wait for the intercept interval to elapse
      await PageObjects.common.sleep(CONFIGURED_TRIAL_INTERCEPT_INTERVAL + 100);
      // Refresh the page at this point the configured interval will have elapsed so we expect the intercept to be displayed
      await browser.refresh();
    });

    it('gets dismissed, when the not now button is clicked', async () => {
      await retry.waitFor('wait for product intercept to be displayed', async () => {
        return await testSubjects.exists(`*intercept-`);
      });

      await testSubjects.click('productInterceptDismissButton');

      // intercept should not be displayed anymore
      await find.byCssSelector(trialInterceptSelector).catch((err) => {
        expect(err.message).to.ok();
      });
    });

    it('would not be displayed again, after dismissal', async () => {
      // Wait for the intercept interval to elapse
      await PageObjects.common.sleep(CONFIGURED_TRIAL_INTERCEPT_INTERVAL);

      // Refresh the page at this point the configured interval will have elapsed
      await browser.refresh();

      // expect the intercept to not be displayed
      await testSubjects.missingOrFail('*intercept-');
    });
  });
};
