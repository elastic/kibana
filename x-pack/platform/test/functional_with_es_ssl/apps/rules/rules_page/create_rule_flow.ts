/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const browser = getService('browser');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('Create Rule Flow', () => {
    const getRuleIdByName = async (name: string) => {
      const response = await supertest
        .get(`/api/alerting/rules/_find?search=${name}&search_fields=name`)
        .expect(200);
      const found = response.body.data.find((rule: { name: string }) => rule.name === name);
      return found ? found.id : undefined;
    };

    before(async () => {
      await pageObjects.common.navigateToApp('rules');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('create rule button is visible and enabled', async () => {
      await retry.waitFor(
        'Create Rule button is visible',
        async () => await testSubjects.exists('createRuleButton')
      );
      await retry.waitFor(
        'Create Rule button is enabled',
        async () => await testSubjects.isEnabled('createRuleButton')
      );
    });

    it('clicking create rule button opens rule type modal', async () => {
      await testSubjects.click('createRuleButton');
      await retry.waitFor(
        'Rule Type Modal is visible',
        async () => await testSubjects.exists('ruleTypeModal')
      );
    });

    it('selecting a rule type navigates to create form', async () => {
      await testSubjects.click('test.noop-SelectOption');
      await retry.waitFor(
        'Create Rule form is visible',
        async () => await testSubjects.exists('ruleForm')
      );
    });

    it('creates a rule and displays it in the rules list', async () => {
      const ruleName = `test-rule-${Date.now()}`;

      // Fill in rule name
      await testSubjects.setValue('ruleDetailsNameInput', ruleName);

      // Save the rule
      await testSubjects.click('rulePageFooterSaveButton');

      // Handle confirmation modal if it appears
      const confirmationModalExists = await testSubjects.exists('confirmCreateRuleModal');
      if (confirmationModalExists) {
        await testSubjects.click('confirmModalConfirmButton');
      }

      // Wait for success toast and navigation
      await pageObjects.header.waitUntilLoadingHasFinished();

      // Navigate back to rules page to verify the rule appears
      await pageObjects.common.navigateToApp('rules');
      await pageObjects.header.waitUntilLoadingHasFinished();

      // Search for the created rule
      await pageObjects.triggersActionsUI.searchAlerts(ruleName);

      // Verify the rule appears in the list
      await retry.try(async () => {
        const rulesList = await pageObjects.triggersActionsUI.getAlertsList();
        const foundRule = rulesList.find((rule) => rule.name.indexOf(ruleName) !== -1);
        expect(foundRule).to.not.be(undefined);
        expect(foundRule?.name).to.contain(ruleName);
      });

      // Track the created rule for cleanup
      const ruleId = await getRuleIdByName(ruleName);
      objectRemover.add(ruleId, 'rule', 'alerting');
    });

    it('return path is set correctly after rule creation', async () => {
      // Start on the rules page
      await pageObjects.common.navigateToApp('rules');
      await pageObjects.header.waitUntilLoadingHasFinished();

      // Create a new rule
      const ruleName = `test-rule-return-path-${Date.now()}`;

      // Click create rule button
      await retry.waitFor(
        'Create Rule button is visible',
        async () => await testSubjects.exists('createRuleButton')
      );
      await testSubjects.click('createRuleButton');

      // Select rule type
      await retry.waitFor(
        'Rule Type Modal is visible',
        async () => await testSubjects.exists('ruleTypeModal')
      );
      await testSubjects.click('test.noop-SelectOption');

      // Wait for form to load
      await retry.waitFor(
        'Create Rule form is visible',
        async () => await testSubjects.exists('ruleForm')
      );

      // Fill in rule name
      await testSubjects.setValue('ruleDetailsNameInput', ruleName);

      // Save the rule
      await testSubjects.click('rulePageFooterSaveButton');

      // Handle confirmation modal if it appears
      const confirmationModalExists = await testSubjects.exists('confirmCreateRuleModal');
      if (confirmationModalExists) {
        await testSubjects.click('confirmModalConfirmButton');
      }

      // Get the rule ID for verification

      // Wait for automatic redirect to rule details page (not manual navigation)

      let ruleId: string | undefined;

      await retry.try(
        async () => {
          ruleId = await getRuleIdByName(ruleName);
          if (!ruleId) {
            throw new Error(`Rule with name ${ruleName} not found`);
          }
          objectRemover.add(ruleId, 'rule', 'alerting');
        },
        undefined,
        3000
      );

      await retry.try(async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        const url = await browser.getCurrentUrl();
        if (!url.includes(`/app/rules/${ruleId}`)) {
          throw new Error(`Expected URL to contain '/app/rules/${ruleId}' but got: ${url}`);
        }
      });

      // Verify we're on the rule details page by checking for rule details elements
      await retry.try(async () => {
        await testSubjects.existOrFail('ruleDetailsTitle');
      });

      // Verify the URL contains the rule details path
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/app/rules/${ruleId}`);
    });
  });
};
