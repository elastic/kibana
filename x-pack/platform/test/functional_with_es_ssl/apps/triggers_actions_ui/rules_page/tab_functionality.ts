/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const browser = getService('browser');
  const retry = getService('retry');

  describe('Tab Functionality', () => {
    before(async () => {
      await pageObjects.common.navigateToApp('rules');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('Rules tab is selected by default', async () => {
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/rules');
        expect(url).to.not.contain('/app/rules/logs');
      });
      await testSubjects.existOrFail('rulesList');
    });

    it('Logs tab is visible when user has permissions', async () => {
      const logsTabExists = await testSubjects.exists('logsTab');
      expect(logsTabExists).to.be(true);
    });

    it('clicking Logs tab navigates to /app/rules/logs', async () => {
      await testSubjects.click('logsTab');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/rules/logs');
      });
    });

    it('clicking Rules tab navigates to /app/rules', async () => {
      await testSubjects.click('rulesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/rules');
        expect(url).to.not.contain('/app/rules/logs');
      });
      await testSubjects.existOrFail('rulesList');
    });

    it('URL updates correctly when switching tabs', async () => {
      await testSubjects.click('rulesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/rules');
        expect(url).to.not.contain('/app/rules/logs');
      });

      await testSubjects.click('logsTab');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/rules/logs');
      });

      await testSubjects.click('rulesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/rules');
        expect(url).to.not.contain('/app/rules/logs');
      });
    });
  });
};
