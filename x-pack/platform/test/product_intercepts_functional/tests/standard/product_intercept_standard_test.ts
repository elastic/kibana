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
  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('Standard Product intercept', () => {
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
        /productInterceptTrigger/.test((await interceptElement.getAttribute('data-test-subj'))!)
      ).to.be(true);
    });

    it('the intercept will be displayed again for the same user after a terminal interaction after the configured interval elapses', async () => {
      await testSubjects.click('productInterceptDismissButton');

      await retry.waitFor('wait for product intercept to be displayed', async () => {
        return await testSubjects.exists('*intercept-');
      });
    });

    it('will display the intercept even if the user transitions to a different tab, interacts with it in the new tab and transitions back', async () => {
      await testSubjects.click('productInterceptDismissButton');

      // open a new tab and navigate to the discover app
      await browser.openNewTab();

      await PageObjects.common.navigateToApp('discover');

      // expect that the intercept is displayed in the new tab
      await retry.waitFor('wait for product intercept to be displayed', async () => {
        return await testSubjects.exists('*intercept-');
      });

      // dismiss the intercept in the new tab
      await testSubjects.click('productInterceptDismissButton');

      // switch back to the original tab and expect that the intercept would still get displayed
      await browser.switchTab(0);

      await retry.waitFor('wait for product intercept to be displayed', async () => {
        return await testSubjects.exists('*intercept-');
      });

      // dismiss the intercept in the original tab
      await testSubjects.click('productInterceptDismissButton');
    });

    it('presents all available steps', async () => {
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
  });
}
