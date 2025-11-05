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
  const webhookJson =
    `{\n` +
    `"short_description": "{{context.rule.name}}",\n` +
    `"description": "{{context.rule.description}}"`;

  describe('webhook connector', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('webhook connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('webhook');
      await testSubjects.setValue('nameInput', 'Webhook test connector');
      await testSubjects.setValue('webhookUrlText', 'https://example.com');
      await testSubjects.setValue('webhookUserInput', 'testuser');
      await testSubjects.setValue('webhookPasswordInput', 'password');
      await commonScreenshots.takeScreenshot('webhook-connector', screenshotDirectories);
      const saveTestButton = await testSubjects.find('create-connector-flyout-save-test-btn');
      await saveTestButton.click();
      await testSubjects.setValue('actionJsonEditor', webhookJson);
      await commonScreenshots.takeScreenshot('webhook-params-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
