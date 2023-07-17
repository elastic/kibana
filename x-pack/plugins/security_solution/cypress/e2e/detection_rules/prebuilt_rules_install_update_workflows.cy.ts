/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkInstallPackageInfo } from '@kbn/fleet-plugin/common';
import type { Rule } from '../../../public/detection_engine/rule_management/logic/types';
import { createRuleAssetSavedObject } from '../../helpers/rules';
import {
  GO_BACK_TO_RULES_TABLE_BUTTON,
  INSTALL_ALL_RULES_BUTTON,
  INSTALL_SELECTED_RULES_BUTTON,
  RULES_MANAGEMENT_TABLE,
  RULES_ROW,
  RULES_UPDATES_TABLE,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  TOASTER,
} from '../../screens/alerts_detection_rules';
import { waitForRulesTableToBeLoaded } from '../../tasks/alerts_detection_rules';
import {
  getRuleAssets,
  createAndInstallMockedPrebuiltRules,
} from '../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState, deleteAlertsAndRules, reload } from '../../tasks/common';
import { esArchiverResetKibana } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';
import {
  addElasticRulesButtonClick,
  assertRuleUpgradeAvailableAndUpgradeAll,
  ruleUpdatesTabClick,
} from '../../tasks/prebuilt_rules';

describe('Detection rules, Prebuilt Rules Installation and Update workflow', () => {
  beforeEach(() => {
    login();
    resetRulesTableState();
    deleteAlertsAndRules();
    esArchiverResetKibana();

    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
  });

  describe('Installation of prebuilt rules package via Fleet', () => {
    beforeEach(() => {
      cy.intercept('POST', '/api/fleet/epm/packages/_bulk*').as('installPackageBulk');
      cy.intercept('POST', '/api/fleet/epm/packages/security_detection_engine/*').as(
        'installPackage'
      );
      waitForRulesTableToBeLoaded();
    });

    it('should install package from Fleet in the background', () => {
      /* Assert that the package in installed from Fleet by checking that
      /* the installSource is "registry", as opposed to "bundle" */
      cy.wait('@installPackageBulk', {
        timeout: 60000,
      }).then(({ response: bulkResponse }) => {
        cy.wrap(bulkResponse?.statusCode).should('eql', 200);

        const packages = bulkResponse?.body.items.map(
          ({ name, result }: BulkInstallPackageInfo) => ({
            name,
            installSource: result.installSource,
          })
        );

        const packagesBulkInstalled = packages.map(({ name }: { name: string }) => name);

        // Under normal flow the package is installed via the Fleet bulk install API.
        // However, for testing purposes the package can be installed via the Fleet individual install API,
        // so we need to intercept and wait for that request as well.
        if (!packagesBulkInstalled.includes('security_detection_engine')) {
          // Should happen only during testing when the `xpack.securitySolution.prebuiltRulesPackageVersion` flag is set
          cy.wait('@installPackage').then(({ response }) => {
            cy.wrap(response?.statusCode).should('eql', 200);
            cy.wrap(response?.body)
              .should('have.property', 'items')
              .should('have.length.greaterThan', 0);
            cy.wrap(response?.body)
              .should('have.property', '_meta')
              .should('have.property', 'install_source')
              .should('eql', 'registry');
          });
        } else {
          // Normal flow, install via the Fleet bulk install API
          expect(packages.length).to.have.greaterThan(0);
          expect(packages).to.deep.include.members([
            { name: 'security_detection_engine', installSource: 'registry' },
          ]);
        }
      });
    });

    it('should install rules from the Fleet package when user clicks on CTA', () => {
      const getRulesAndAssertNumberInstalled = () => {
        getRuleAssets().then((response) => {
          const ruleIds = response.body.hits.hits.map(
            (hit: { _source: { ['security-rule']: Rule } }) => hit._source['security-rule'].rule_id
          );

          const numberOfRulesToInstall = new Set(ruleIds).size;
          addElasticRulesButtonClick();

          cy.get(INSTALL_ALL_RULES_BUTTON).click();
          cy.get(TOASTER)
            .should('be.visible')
            .should('have.text', `${numberOfRulesToInstall} rules installed successfully.`);
        });
      };
      /* Retrieve how many rules were installed from the Fleet package */
      /* See comments in test above for more details */
      cy.wait('@installPackageBulk', {
        timeout: 60000,
      }).then(({ response: bulkResponse }) => {
        cy.wrap(bulkResponse?.statusCode).should('eql', 200);

        const packagesBulkInstalled = bulkResponse?.body.items.map(
          ({ name }: { name: string }) => name
        );

        if (!packagesBulkInstalled.includes('security_detection_engine')) {
          cy.wait('@installPackage').then(() => {
            getRulesAndAssertNumberInstalled();
          });
        } else {
          getRulesAndAssertNumberInstalled();
        }
      });
    });
  });

  describe('Installation of prebuilt rules', () => {
    const RULE_1 = createRuleAssetSavedObject({
      name: 'Test rule 1',
      rule_id: 'rule_1',
    });
    const RULE_2 = createRuleAssetSavedObject({
      name: 'Test rule 2',
      rule_id: 'rule_2',
    });
    beforeEach(() => {
      createAndInstallMockedPrebuiltRules({ rules: [RULE_1, RULE_2], installToKibana: false });
      waitForRulesTableToBeLoaded();
    });

    it('should install selected rules when user clicks on Install selected rules', () => {
      addElasticRulesButtonClick();
      cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
      cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
      cy.get(TOASTER).should('be.visible').should('have.text', `2 rules installed successfully.`);
      cy.get(GO_BACK_TO_RULES_TABLE_BUTTON).click();
      cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length', 2);
      cy.get(RULES_MANAGEMENT_TABLE).contains(RULE_1['security-rule'].name);
      cy.get(RULES_MANAGEMENT_TABLE).contains(RULE_2['security-rule'].name);
    });

    it('should fail gracefully with toast error message when request to install rules fails', () => {
      /* Stub request to force rules installation to fail */
      cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/installation/_perform', {
        statusCode: 500,
      }).as('installPrebuiltRules');
      addElasticRulesButtonClick();
      cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
      cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
      cy.wait('@installPrebuiltRules');
      cy.get(TOASTER).should('be.visible').should('have.text', 'Rule installation failed');
    });
  });

  describe('Update of prebuilt rules', () => {
    const RULE_ID = 'rule_id';
    const OUTDATED_RULE = createRuleAssetSavedObject({
      name: 'Outdated rule',
      rule_id: RULE_ID,
      version: 1,
    });
    const UPDATED_RULE = createRuleAssetSavedObject({
      name: 'Updated rule',
      rule_id: RULE_ID,
      version: 2,
    });
    beforeEach(() => {
      /* Create a new rule and install it */
      createAndInstallMockedPrebuiltRules({ rules: [OUTDATED_RULE] });
      /* Create a second version of the rule, making it available for update */
      createAndInstallMockedPrebuiltRules({ rules: [UPDATED_RULE], installToKibana: false });
      waitForRulesTableToBeLoaded();
      reload();
    });

    it('should update rule succesfully', () => {
      cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/upgrade/_perform').as(
        'updatePrebuiltRules'
      );
      ruleUpdatesTabClick();
      assertRuleUpgradeAvailableAndUpgradeAll(OUTDATED_RULE);
      cy.get(TOASTER).should('be.visible').should('have.text', `1 rule updated successfully.`);
    });

    it('should fail gracefully with toast error message when request to update rules fails', () => {
      /* Stub request to force rules update to fail */
      cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/upgrade/_perform', {
        statusCode: 500,
      }).as('updatePrebuiltRules');
      ruleUpdatesTabClick();
      assertRuleUpgradeAvailableAndUpgradeAll(OUTDATED_RULE);
      cy.get(TOASTER).should('be.visible').should('have.text', 'Rule update failed');

      /* Assert that the rule has not been updated in the UI */
      cy.get(RULES_UPDATES_TABLE).should('contain', OUTDATED_RULE['security-rule'].name);
    });
  });
});
