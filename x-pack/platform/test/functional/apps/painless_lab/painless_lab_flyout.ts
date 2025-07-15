/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const testSubjects = getService('testSubjects');

  describe('Painless lab', function describeIndexTests() {
    before(async () => {
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/painless_lab' });
      await retry.waitFor('Wait for editor to be visible', async () => {
        return testSubjects.isDisplayed('painless_lab');
      });
    });

    it('click show API request button and flyout should appear in page', async () => {
      await testSubjects.click('btnViewRequest');

      await testSubjects.existOrFail('painlessLabRequestFlyoutHeader', { timeout: 10 * 1000 });
    });
  });
}
