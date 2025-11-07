/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { ObjectRemover } from '../../lib/object_remover';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const log = getService('log');
  const browser = getService('browser');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const objectRemover = new ObjectRemover(supertest);

  describe('Rules page', function () {
    describe('Page Navigation and Loading', () => {
      before(async () => {
        await pageObjects.common.navigateToApp('rules');
      });

      it('navigates to /app/rules successfully', async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/rules');
      });

      it('loads with correct page title', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        const pageTitle = await testSubjects.getVisibleText('rulesPageTitle');
        expect(pageTitle).to.be('Rules');
      });

      it('displays the rules list', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('rulesList');
      });

      it('loading spinner disappears', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        // Verify that the page is fully loaded by checking for the rules list
        await testSubjects.existOrFail('rulesList');
      });
    });

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
  });
};
