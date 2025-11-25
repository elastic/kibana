/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('Product intercept for upgrade event', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('home');
      await retry.waitFor('wait for product intercept to be displayed', async () => {
        return await testSubjects.exists(`*intercept-`);
      });
    });

    it('the product intercept remains visible when the user navigates to a different page', async () => {
      await PageObjects.common.navigateToApp('discover');

      await retry.waitFor('wait for product intercept to be displayed', async () => {
        return await testSubjects.exists('*intercept-');
      });

      const interceptElement = await testSubjects.find('*intercept-');

      expect(
        /productUpgradeInterceptTrigger/.test(
          (await interceptElement.getAttribute('data-test-subj'))!
        )
      ).to.be(true);
    });

    it('the upgrade intercept will not be displayed again for the same user after a terminal interaction', async () => {
      await testSubjects.click('productInterceptDismissButton');

      await browser.refresh();

      await testSubjects.missingOrFail('*intercept-');
    });
  });
}
