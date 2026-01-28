/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';
import { getTestAlertData } from '../../../lib/get_test_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const browser = getService('browser');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('Tab Functionality', () => {
    before(async () => {
      // Create a test rule before navigation so the rules list component will render
      const { body: createdRule } = await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);

      objectRemover.add(createdRule.id, 'rule', 'alerting');

      // Refresh browser to ensure the newly created rule is visible in the UI
      await browser.refresh();
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('Rules tab is selected by default', async () => {
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/management/insightsAndAlerting/triggersActions');
        expect(url).to.not.contain('/app/management/insightsAndAlerting/triggersActions/logs');
      });
      await testSubjects.existOrFail('rulesList');
    });

    it('Logs tab is visible when user has permissions', async () => {
      const logsTabExists = await testSubjects.exists('logsTab');
      expect(logsTabExists).to.be(true);
    });

    it('clicking Logs tab navigates to /app/management/insightsAndAlerting/triggersActions/logs', async () => {
      await testSubjects.click('logsTab');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/management/insightsAndAlerting/triggersActions/logs');
      });
    });

    it('clicking Rules tab navigates to /app/management/insightsAndAlerting/triggersActions', async () => {
      await testSubjects.click('rulesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/management/insightsAndAlerting/triggersActions');
        expect(url).to.not.contain('/app/management/insightsAndAlerting/triggersActions/logs');
      });
      await testSubjects.existOrFail('rulesList');
    });

    it('URL updates correctly when switching tabs', async () => {
      await testSubjects.click('rulesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/management/insightsAndAlerting/triggersActions');
        expect(url).to.not.contain('/app/management/insightsAndAlerting/triggersActions/logs');
      });

      await testSubjects.click('logsTab');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/management/insightsAndAlerting/triggersActions/logs');
      });

      await testSubjects.click('rulesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/management/insightsAndAlerting/triggersActions');
        expect(url).to.not.contain('/app/management/insightsAndAlerting/triggersActions/logs');
      });
    });
  });
};
