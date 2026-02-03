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
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('Page Navigation and Loading', () => {
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
      await pageObjects.common.navigateToApp('rules');
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('navigates to /app/rules successfully', async () => {
      const url = await browser.getCurrentUrl();
      expect(url).to.contain('/app/rules');
    });

    it('loads with correct page title', async () => {
      await pageObjects.header.waitUntilLoadingHasFinished();
      const pageTitle = await testSubjects.getVisibleText('appTitle');
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
};
