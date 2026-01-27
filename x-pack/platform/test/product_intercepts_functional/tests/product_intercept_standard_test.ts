/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TRIGGER_DEF_ID } from '@kbn/product-intercept-plugin/common/constants';
import { INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY } from '@kbn/intercepts-plugin/common/constants';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  /**
   * @see x-pack/platform/plugins/private/product_intercept/common/config.ts
   */
  const CONFIGURED_STANDARD_INTERCEPT_INTERVAL = 90 * 24 * 60 * 60 * 1000;

  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('Standard Product intercept', () => {
    const interceptTestId = `intercept-${TRIGGER_DEF_ID}`;

    describe('on initial page load', () => {
      it('presents all available navigable steps', async () => {
        await PageObjects.common.navigateToUrl('home');

        // adjust timing record with a value that's in the past considering the configured interval,
        // so that the intercept would be displayed to the user
        await browser.setLocalStorageItem(
          INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY,
          JSON.stringify({
            [TRIGGER_DEF_ID]: {
              // set record time that's in the past considering the configured interval
              timerStart: new Date(Date.now() - CONFIGURED_STANDARD_INTERCEPT_INTERVAL - 1000),
            },
          })
        );

        // Refresh the page and expect the intercept to be displayed
        await browser.refresh();

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
    });

    describe('page transitions', () => {
      it('transitions from one tab to another and back again will cause the intercept to be displayed if the intercept interval has elapsed on transitioning', async () => {
        // navigate the home journey to set a record for new intercept journey
        await PageObjects.common.navigateToUrl('home');

        // open a new tab and navigate to the discover app
        await browser.openNewTab();

        await PageObjects.common.navigateToApp('discover');

        // update record so the intercept will be in a valid state to display on page transition
        await browser.setLocalStorageItem(
          INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY,
          JSON.stringify({
            [TRIGGER_DEF_ID]: {
              // set record time that's in the past considering the configured interval
              timerStart: new Date(Date.now() - CONFIGURED_STANDARD_INTERCEPT_INTERVAL - 1000),
            },
          })
        );

        // switch back to the original tab and expect the intercept to be displayed
        await browser.switchTab(0);

        await retry.waitFor('wait for product intercept to be displayed', async () => {
          const intercept = await testSubjects.find(interceptTestId);
          return intercept.isDisplayed();
        });

        // dismiss the intercept in the original tab
        await testSubjects.click('productInterceptDismissButton');
      });
    });
  });
}
