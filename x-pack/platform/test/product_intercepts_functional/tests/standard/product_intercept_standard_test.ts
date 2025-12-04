/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TRIGGER_DEF_ID } from '@kbn/product-intercept-plugin/common/constants';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  /**
   * @see config.ts
   */
  const CONFIGURED_STANDARD_INTERCEPT_INTERVAL = 10 * 1000;

  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('Standard Product intercept', () => {
    describe('on initial page load', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('home');
        // Wait for the intercept interval to elapse
        await PageObjects.common.sleep(CONFIGURED_STANDARD_INTERCEPT_INTERVAL + 100);
        // Refresh the page at this point the configured interval will have elapsed so we expect the intercept to be displayed
        await browser.refresh();
        await retry.waitFor('wait for product intercept to be displayed', async () => {
          return await testSubjects.exists(`*intercept-`);
        });
      });

      it('presents all available navigable steps', async () => {
        const interceptTestId = `intercept-${TRIGGER_DEF_ID}`;

        await retry.waitFor('wait for product intercept to be displayed', async () => {
          const intercept = await testSubjects.find(interceptTestId);
          return intercept.isDisplayed();
        });

        // Navigate to the intercept steps
        await testSubjects.click('productInterceptProgressionButton');

        let progressionButton:
          | (ReturnType<typeof testSubjects.find> extends Promise<infer R> ? R : never)
          | null = null;

        do {
          // we know there are 5 possible responses, so we can randomly select one of them
          await testSubjects.click(`nps-${Math.floor(Math.random() * 4) + 1}`);
          // the progression button is only visible at the start and completion of the survey
          progressionButton = await testSubjects
            .find('productInterceptProgressionButton')
            .catch(() => null);
        } while (!progressionButton);

        expect(await progressionButton.getVisibleText()).to.be('Close');

        const intercept = await testSubjects.find(interceptTestId);

        expect(/Thanks for the feedback!/.test(await intercept.getVisibleText())).to.be(true);
      });

      it('the intercept will be displayed again for the same user after a terminal interaction after the configured interval elapses', async () => {
        await testSubjects.click('productInterceptDismissButton');

        // Refresh the page to set a new record for the new interval journey
        await browser.refresh();

        // Wait for the intercept interval to elapse
        await PageObjects.common.sleep(CONFIGURED_STANDARD_INTERCEPT_INTERVAL);

        // Refresh the page at this point the configured interval will have elapsed so we expect the intercept to be displayed
        await browser.refresh();

        await retry.waitFor('wait for product intercept to be displayed', async () => {
          return await testSubjects.exists('*intercept-');
        });
      });
    });

    describe('page transitions', () => {
      it('transitions from one tab to another and back again will cause the intercept to be displayed if the intercept interval has elapsed on transitioning', async () => {
        // navigate the home journey to set a record for new intercept journey
        await PageObjects.common.navigateToApp('home');

        // open a new tab and navigate to the discover app
        await browser.openNewTab();

        await PageObjects.common.navigateToApp('discover');

        // Wait for the intercept interval to elapse
        await PageObjects.common.sleep(CONFIGURED_STANDARD_INTERCEPT_INTERVAL);

        // switch back to the original tab and expect that the intercept would still get displayed
        await browser.switchTab(0);

        await retry.waitFor('wait for product intercept to be displayed', async () => {
          return await testSubjects.exists('*intercept-');
        });

        // dismiss the intercept in the original tab
        await testSubjects.click('productInterceptDismissButton');
      });
    });
  });
}
