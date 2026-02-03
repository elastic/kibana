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

  describe('Edit Rule Flow', () => {
    let testRuleId: string;
    const testRuleName = `edit-test-rule-${Date.now()}`;

    const createTestRule = async (name: string) => {
      const response = await supertest
        .post('/api/alerting/rule')
        .set('kbn-xsrf', 'foo')
        .send({
          name,
          rule_type_id: 'test.noop',
          enabled: true,
          consumer: 'alerts',
          tags: [],
          notify_when: 'onActiveAlert',
          schedule: {
            interval: '1m',
          },
          actions: [],
          params: {},
        })
        .expect(200);

      return response.body.id;
    };

    const getRuleById = async (id: string) => {
      const response = await supertest.get(`/api/alerting/rule/${id}`).expect(200);
      return response.body;
    };

    before(async () => {
      // Create a test rule to edit
      testRuleId = await createTestRule(testRuleName);
      objectRemover.add(testRuleId, 'rule', 'alerting');
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    describe('Edit from rules list', () => {
      it('navigates to edit page when clicking edit button', async () => {
        // Navigate to rules page
        await pageObjects.common.navigateToApp('rules');
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Search for our test rule
        await pageObjects.triggersActionsUI.searchAlerts(testRuleName);

        // Wait for the rule to appear and click edit
        await retry.try(async () => {
          const rulesList = await pageObjects.triggersActionsUI.getAlertsList();
          const foundRule = rulesList.find((rule) => rule.name.indexOf(testRuleName) !== -1);
          expect(foundRule).to.not.be(undefined);
        });

        // Click the edit button (pencil icon)
        await testSubjects.click('editActionHoverButton');

        // Wait for navigation to edit page
        await retry.try(async () => {
          const url = await browser.getCurrentUrl();
          if (!url.includes(`/app/rules/edit/${testRuleId}`)) {
            throw new Error(
              `Expected URL to contain '/app/rules/edit/${testRuleId}' but got: ${url}`
            );
          }
        });

        // Verify the edit form is loaded
        await retry.try(async () => {
          await testSubjects.existOrFail('ruleForm');
        });

        // Verify the rule name is populated in the form
        const nameInput = await testSubjects.find('ruleDetailsNameInput');
        const nameValue = await nameInput.getAttribute('value');
        expect(nameValue).to.equal(testRuleName);
      });

      it('returns to rules list after saving', async () => {
        // We should be on the edit page from the previous test
        const currentUrl = await browser.getCurrentUrl();
        expect(currentUrl).to.contain(`/app/rules/edit/${testRuleId}`);

        // Make a small change to the rule name
        const updatedName = `${testRuleName}-updated`;
        await testSubjects.setValue('ruleDetailsNameInput', updatedName);

        // Save the rule
        await testSubjects.click('rulePageFooterSaveButton');

        // Handle confirmation modal if it appears
        const confirmationModalExists = await testSubjects.exists('confirmCreateRuleModal');
        if (confirmationModalExists) {
          await testSubjects.click('confirmModalConfirmButton');
        }

        // Wait for navigation back to rules list
        await retry.try(async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          const url = await browser.getCurrentUrl();
          if (
            !url.includes('/app/rules') ||
            url.includes('/edit/') ||
            url.includes(`/${testRuleId}`)
          ) {
            throw new Error(`Expected to be on rules list page but got: ${url}`);
          }
        });

        // Verify we're on the rules list page
        await retry.try(async () => {
          await testSubjects.existOrFail('createRuleButton');
        });

        // Verify the rule was updated
        const updatedRule = await getRuleById(testRuleId);
        expect(updatedRule.name).to.equal(updatedName);

        // Reset the name for other tests
        await supertest
          .put(`/api/alerting/rule/${testRuleId}`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: testRuleName,
            schedule: { interval: '1m' },
            notify_when: 'onActiveAlert',
            actions: [],
            params: {},
          })
          .expect(200);
      });

      it('returns to rules list after clicking cancel', async () => {
        // Navigate to rules page
        await pageObjects.common.navigateToApp('rules');
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Search for our test rule
        await pageObjects.triggersActionsUI.searchAlerts(testRuleName);

        // Click the edit button
        await testSubjects.click('editActionHoverButton');

        // Wait for edit form to load
        await retry.try(async () => {
          await testSubjects.existOrFail('ruleForm');
        });

        // Click cancel button
        await testSubjects.click('rulePageFooterCancelButton');

        // Wait for navigation back to rules list
        await retry.try(async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          const url = await browser.getCurrentUrl();
          if (
            !url.includes('/app/rules') ||
            url.includes('/edit/') ||
            url.includes(`/${testRuleId}`)
          ) {
            throw new Error(`Expected to be on rules list page but got: ${url}`);
          }
        });

        // Verify we're on the rules list page
        await retry.try(async () => {
          await testSubjects.existOrFail('createRuleButton');
        });
      });
    });

    describe('Edit from rule details page', () => {
      it('navigates to edit page when clicking edit button from details', async () => {
        // Navigate directly to rule details page
        await pageObjects.common.navigateToUrl('rules', testRuleId, {
          shouldUseHashForSubUrl: false,
        });
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify we're on the details page
        await retry.try(async () => {
          await testSubjects.existOrFail('ruleDetailsTitle');
        });

        // Click the edit button
        await testSubjects.click('openEditRuleFlyoutButton');

        // Wait for navigation to edit page
        await retry.try(async () => {
          const url = await browser.getCurrentUrl();
          if (!url.includes(`/app/rules/edit/${testRuleId}`)) {
            throw new Error(
              `Expected URL to contain '/app/rules/edit/${testRuleId}' but got: ${url}`
            );
          }
        });

        // Verify the edit form is loaded
        await retry.try(async () => {
          await testSubjects.existOrFail('ruleForm');
        });
      });

      it('returns to rule details page after saving from details', async () => {
        // We should be on the edit page from the previous test
        const currentUrl = await browser.getCurrentUrl();
        expect(currentUrl).to.contain(`/app/rules/edit/${testRuleId}`);

        // Make a small change
        const updatedName = `${testRuleName}-details-updated`;
        await testSubjects.setValue('ruleDetailsNameInput', updatedName);

        // Save the rule
        await testSubjects.click('rulePageFooterSaveButton');

        // Handle confirmation modal if it appears
        const confirmationModalExists = await testSubjects.exists('confirmCreateRuleModal');
        if (confirmationModalExists) {
          await testSubjects.click('confirmModalConfirmButton');
        }

        // Wait for navigation back to rule details page
        await retry.try(async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          const url = await browser.getCurrentUrl();
          if (!url.includes(`/app/rules/${testRuleId}`) || url.includes('/edit/')) {
            throw new Error(`Expected to be on rule details page but got: ${url}`);
          }
        });

        // Verify we're on the rule details page
        await retry.try(async () => {
          await testSubjects.existOrFail('ruleDetailsTitle');
        });

        // Verify the rule was updated
        const updatedRule = await getRuleById(testRuleId);
        expect(updatedRule.name).to.equal(updatedName);

        // Reset the name
        await supertest
          .put(`/api/alerting/rule/${testRuleId}`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: testRuleName,
            schedule: { interval: '1m' },
            notify_when: 'onActiveAlert',
            actions: [],
            params: {},
          })
          .expect(200);
      });

      it('returns to rule details page after clicking cancel from details', async () => {
        // Navigate to rule details page
        await pageObjects.common.navigateToUrl('rules', testRuleId, {
          shouldUseHashForSubUrl: false,
        });
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Click the edit button
        await testSubjects.click('openEditRuleFlyoutButton');

        // Wait for edit form to load
        await retry.try(async () => {
          await testSubjects.existOrFail('ruleForm');
        });

        // Click cancel button
        await testSubjects.click('rulePageFooterCancelButton');

        // Wait for navigation back to rule details page
        await retry.try(async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          const url = await browser.getCurrentUrl();
          if (!url.includes(`/app/rules/${testRuleId}`) || url.includes('/edit/')) {
            throw new Error(`Expected to be on rule details page but got: ${url}`);
          }
        });

        // Verify we're on the rule details page
        await retry.try(async () => {
          await testSubjects.existOrFail('ruleDetailsTitle');
        });
      });
    });
  });
};
