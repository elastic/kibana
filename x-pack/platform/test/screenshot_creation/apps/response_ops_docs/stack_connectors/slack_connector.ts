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

  describe('slack connector', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('slack api connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('slack');
      await testSubjects.click('.slack_apiButton');
      await testSubjects.setValue('nameInput', 'Slack api test connector');
      await testSubjects.setValue('secrets.token-input', 'xoxb-XXXX-XXXX-XXXX');
      await commonScreenshots.takeScreenshot('slack-api-connector', screenshotDirectories);
      await testSubjects.click('create-connector-flyout-back-btn');
    });

    it('slack webhook connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('slack');
      await testSubjects.setValue('nameInput', 'Slack webhook test connector');
      await testSubjects.setValue(
        'slackWebhookUrlInput',
        'https://hooks.slack.com/services/abcd/ljklmnopqrstuvwxz'
      );
      await commonScreenshots.takeScreenshot('slack-webhook-connector', screenshotDirectories);
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await testSubjects.click('toastCloseButton');
      await commonScreenshots.takeScreenshot('slack-webhook-params', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
