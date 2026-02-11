/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UPGRADE_TRIGGER_DEF_PREFIX_ID } from '@kbn/product-intercept-plugin/common/constants';
import { INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY } from '@kbn/intercepts-plugin/common/constants';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  /**
   * @see x-pack/platform/plugins/private/product_intercept/common/config.ts
   */
  const CONFIGURED_UPGRADE_INTERCEPT_INTERVAL = 7 * 24 * 60 * 60 * 1000;

  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');

  describe('Product intercept for upgrade event', () => {
    let interceptUpgradeTriggerDefId: string;

    before(async () => {
      const kibanaVersion = await kibanaServer.version.get();

      interceptUpgradeTriggerDefId = `${UPGRADE_TRIGGER_DEF_PREFIX_ID}:${kibanaVersion}`;
    });

    describe('page load checks', () => {
      it("displays the upgrade intercept if it's display condition is met", async () => {
        await PageObjects.common.navigateToUrl('home');

        // adjust timing record with a value that's in the past considering the configured interval,
        // so that the intercept would be displayed to the user
        await browser.setLocalStorageItem(
          INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY,
          JSON.stringify({
            [interceptUpgradeTriggerDefId]: {
              // set record time that's in the past considering the configured interval
              timerStart: new Date(Date.now() - CONFIGURED_UPGRADE_INTERCEPT_INTERVAL - 1000),
            },
          })
        );

        // Refresh the page at this point the configured interval condition will be met so we expect the intercept to be displayed
        await browser.refresh();

        await retry.waitFor('wait for upgrade product intercept to be displayed', async () => {
          const intercept = await testSubjects.find(`intercept-${interceptUpgradeTriggerDefId}`);
          return intercept.isDisplayed();
        });

        // dismiss the intercept
        await testSubjects.click('productInterceptDismissButton');
      });
    });
  });
}
