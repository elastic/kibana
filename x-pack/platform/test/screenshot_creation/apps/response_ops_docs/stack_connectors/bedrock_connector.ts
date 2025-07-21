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

  describe('Amazon bedrock connector', function () {
    it('Amazon bedrock connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('bedrock');
      await testSubjects.setValue('nameInput', 'Bedrock test connector');
      await testSubjects.setValue('secrets.accessKey-input', 'testkey');
      await testSubjects.setValue('secrets.secret-input', 'testsecret');
      await commonScreenshots.takeScreenshot(
        'bedrock-connector',
        screenshotDirectories,
        1920,
        1200
      );
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await testSubjects.click('toastCloseButton');
      await commonScreenshots.takeScreenshot('bedrock-params', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
