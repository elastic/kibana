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

  describe('pagerduty connector', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });
    it('pagerduty connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('pagerduty');
      await testSubjects.setValue('nameInput', 'PagerDuty test connector');
      await testSubjects.setValue('pagerdutyApiUrlInput', 'https://dev-test.pagerduty.com/');
      await testSubjects.setValue('pagerdutyRoutingKeyInput', 'testkey');
      await commonScreenshots.takeScreenshot('pagerduty-connector', screenshotDirectories);
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await testSubjects.click('toastCloseButton');
      await testSubjects.setValue('eventActionSelect', 'trigger');
      await commonScreenshots.takeScreenshot(
        'pagerduty-trigger-test',
        screenshotDirectories,
        1400,
        1600
      );
      await testSubjects.setValue('eventActionSelect', 'resolve');
      await commonScreenshots.takeScreenshot('pagerduty-resolve-test', screenshotDirectories);
      await testSubjects.setValue('eventActionSelect', 'acknowledge');
      await commonScreenshots.takeScreenshot('pagerduty-acknowledge-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
