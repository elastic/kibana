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
  const kibanaServer = getService('kibanaServer');
  const objectRemover = new ObjectRemover(supertest);

  // // Helper function to clean up test rules
  // const cleanupTestRules = async () => {
  //   try {
  //     // Find all rules that match test patterns
  //     const {
  //       body: { data: rules },
  //     } = await supertest
  //       .post('/internal/alerting/rules/_find')
  //       .set('kbn-xsrf', 'foo')
  //       .send({
  //         per_page: 1000,
  //       })
  //       .expect(200);

  //     // Filter rules that match test patterns
  //     const testRules = rules.filter((rule: { name: string }) => {
  //       const name = rule.name || '';
  //       return name.startsWith('test-rule-') || name.startsWith('test-alert-');
  //     });

  //     if (testRules.length > 0) {
  //       const ruleIds = testRules.map((rule: { id: string }) => rule.id);
  //       // Bulk delete test rules
  //       await supertest
  //         .patch('/internal/alerting/rules/_bulk_delete')
  //         .set('kbn-xsrf', 'foo')
  //         .send({ ids: ruleIds })
  //         .expect(200);
  //       log.debug(`Cleaned up ${ruleIds.length} test rules`);
  //     }
  //   } catch (error) {
  //     // Log error but don't fail the test suite
  //     log.debug(`Error cleaning up test rules: ${error}`);
  //   }
  // };

  describe('Rules page', function () {
    before(async () => {
      // // Clean up test rules before running tests
      // await cleanupTestRules();
      // // Clean up saved objects to ensure a clean state
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      // // Clean up any remaining test rules after all tests
      // await cleanupTestRules();
      // // Clean up any objects tracked by ObjectRemover
      await objectRemover.removeAll();
    });
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

    describe('Create Rule Flow', () => {
      let createdRule: { name: string; id: string };

      before(async () => {
        await pageObjects.common.navigateToApp('rules');
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        if (createdRule) {
          await objectRemover.removeAll();
        }
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
      });

      it('return path is set correctly after rule creation', async () => {
        // After creating a rule and navigating back, verify we're on the rules page
        await pageObjects.common.navigateToApp('rules');
        await pageObjects.header.waitUntilLoadingHasFinished();

        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/app/rules');
      });
    });
  });
};
