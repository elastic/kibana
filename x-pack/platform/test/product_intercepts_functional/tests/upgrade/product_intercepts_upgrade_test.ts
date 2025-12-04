/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  /**
   * @see config.ts
   */
  const CONFIGURED_UPGRADE_INTERCEPT_INTERVAL = 10 * 1000;

  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('Product intercept for upgrade event', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('home');
      // Wait for the intercept interval to elapse
      await PageObjects.common.sleep(CONFIGURED_UPGRADE_INTERCEPT_INTERVAL + 100);
      // Refresh the page at this point the configured interval will have elapsed so we expect the intercept to be displayed
      await browser.refresh();
      await retry.waitFor('wait for product intercept to be displayed', async () => {
        return await testSubjects.exists(`*intercept-`);
      });
    });

    it('the upgrade intercept will not be displayed again for the same user after a terminal interaction', async () => {
      await testSubjects.click('productInterceptDismissButton');

      await browser.refresh();

      // Wait for the intercept interval to elapse
      await PageObjects.common.sleep(CONFIGURED_UPGRADE_INTERCEPT_INTERVAL);

      // Refresh the page at this point the configured interval will have elapsed so we expect the intercept to be displayed
      await browser.refresh();

      await testSubjects.missingOrFail('*intercept-');
    });
  });
}
