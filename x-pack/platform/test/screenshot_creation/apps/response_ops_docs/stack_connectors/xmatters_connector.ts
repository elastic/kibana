/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'stack_connectors'];
  const pageObjects = getPageObjects(['common', 'header']);
  const actions = getService('actions');
  const testSubjects = getService('testSubjects');

  describe('xmatters connector', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('xmatters connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('xmatters');
      await testSubjects.setValue('nameInput', 'xMatters test connector');
      await commonScreenshots.takeScreenshot('xmatters-connector-basic', screenshotDirectories);
      const auth = await testSubjects.find('URL Authentication');
      await auth.click();
      await commonScreenshots.takeScreenshot('xmatters-connector-url', screenshotDirectories);
      await testSubjects.setValue('secrets.secretsUrl', 'https://example.com');
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await testSubjects.click('toastCloseButton');
      await commonScreenshots.takeScreenshot('xmatters-params-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
