/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TRIGGER_DEF_ID } from '@kbn/product-intercept-plugin/common/constants';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  describe('product Intercept on home screen', () => {
    const interceptTestId = `intercept-${TRIGGER_DEF_ID}`;

    beforeEach(async () => {
      await PageObjects.common.navigateToUrl('home');
    });

    it('gets dismissed, when the not now button is clicked', async () => {
      await retry.waitFor('wait for product intercept to be displayed', async () => {
        const intercept = await testSubjects.find(interceptTestId);
        return intercept.isDisplayed();
      });

      await testSubjects.click('productInterceptDismissButton');

      // intercept should not be displayed anymore
      await testSubjects.find(interceptTestId).catch((err) => {
        expect(err.message).to.ok();
      });
    });

    it('displays all available steps', async () => {
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
};
