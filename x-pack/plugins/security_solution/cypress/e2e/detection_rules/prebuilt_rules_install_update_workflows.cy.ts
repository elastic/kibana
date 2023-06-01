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
  ELASTIC_RULES_BTN,
  LOAD_PREBUILT_RULES_BTN,
  LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN,
  RULES_MANAGEMENT_TABLE,
  RULES_ROW,
  TOASTER,
  UPDATE_PREBUILT_RULES_CALLOUT_BUTTON,
} from '../../screens/alerts_detection_rules';
import { waitForRulesTableToBeLoaded } from '../../tasks/alerts_detection_rules';
import {
  createNewRuleAsset,
  getRuleAssets,
  installAvailableRules,
  preventPrebuiltRulesPackageInstallation,
} from '../../tasks/api_calls/prebuilt_rules';
import {
  cleanKibana,
  resetRulesTableState,
  deleteAlertsAndRules,
  reload,
} from '../../tasks/common';
import { esArchiverResetKibana } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';
import {
  installPrebuiltRulesButtonClick,
  installPrebuiltRulesButtonClickWithError,
  updatePrebuiltRulesButtonClick,
  updatePrebuiltRulesButtonClickWithError,
} from '../../tasks/prebuilt_rules';

describe('Detection rules, Prebuilt Rules Installation and Update workflow', () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    resetRulesTableState();
    deleteAlertsAndRules();
    esArchiverResetKibana();

    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
  });

  describe('Installation of prebuilt rules package via Fleet', () => {
    beforeEach(() => {
      cy.intercept('POST', '/api/fleet/epm/packages/_bulk*').as('installPackage');
      waitForRulesTableToBeLoaded();
    });

    it('should install package from Fleet in the background', () => {
      /* Assert that the package in installed from Fleet by checking that
      /* the installSource is "registry", as opposed to "bundle" */
      cy.wait('@installPackage', {
        timeout: 60000,
      }).then(({ response }) => {
        cy.wrap(response?.statusCode).should('eql', 200);

        const packages = response?.body.items.map(({ name, result }: BulkInstallPackageInfo) => ({
          name,
          installSource: result.installSource,
        }));

        expect(packages.length).to.have.greaterThan(0);
        expect(packages).to.deep.include.members([
          { name: 'security_detection_engine', installSource: 'registry' },
        ]);
      });
    });

    it('should install rules from the Fleet package when user clicks on CTA', () => {
      /* Retrieve how many rules were installed from the Fleet package */
      cy.wait('@installPackage', {
        timeout: 60000,
      }).then(() => {
        getRuleAssets().then((response) => {
          const ruleIds = response.body.hits.hits.map(
            (hit: { _source: { ['security-rule']: Rule } }) => hit._source['security-rule'].rule_id
          );

          const numberOfRulesToInstall = [...new Set(ruleIds)].length;
          installPrebuiltRulesButtonClick(LOAD_PREBUILT_RULES_BTN);
          cy.get(TOASTER)
            .should('be.visible')
            .should(
              'have.text',
              'Installed pre-packaged rules and timeline templates from elastic'
            );

          cy.get(ELASTIC_RULES_BTN).contains(numberOfRulesToInstall);
        });
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
      preventPrebuiltRulesPackageInstallation();

      /* Create two mock rules */
      createNewRuleAsset({ rule: RULE_1 });
      createNewRuleAsset({ rule: RULE_2 });
      waitForRulesTableToBeLoaded();
    });

    it('should install available rules when user clicks on main installation call to action', () => {
      installPrebuiltRulesButtonClick(LOAD_PREBUILT_RULES_BTN);
      cy.get(TOASTER)
        .should('be.visible')
        .should('have.text', 'Installed pre-packaged rules and timeline templates from elastic');
      cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length', 2);
      cy.get(RULES_MANAGEMENT_TABLE).contains(RULE_1['security-rule'].name);
      cy.get(RULES_MANAGEMENT_TABLE).contains(RULE_2['security-rule'].name);
    });

    it('should install available rules succesfully when user clicks on header installation call to action', () => {
      installPrebuiltRulesButtonClick(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN);
      cy.get(TOASTER)
        .should('be.visible')
        .should('have.text', 'Installed pre-packaged rules and timeline templates from elastic');
      cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length', 2);
      cy.get(RULES_MANAGEMENT_TABLE).contains(RULE_1['security-rule'].name);
      cy.get(RULES_MANAGEMENT_TABLE).contains(RULE_2['security-rule'].name);
    });

    it('should fail gracefully with toast error message when request to install rules fails', () => {
      /* Stub request to force rules installation to fail */
      cy.intercept('PUT', '/api/detection_engine/rules/prepackaged', {
        statusCode: 500,
      }).as('installPrebuiltRules');
      installPrebuiltRulesButtonClickWithError(LOAD_PREBUILT_RULES_BTN);
      cy.wait('@installPrebuiltRules');
      cy.get(LOAD_PREBUILT_RULES_BTN).should('not.have.attr', 'disabled');
      cy.get(TOASTER)
        .should('be.visible')
        .should('have.text', 'Failed to installed pre-packaged rules and timelines from elastic');
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
      preventPrebuiltRulesPackageInstallation();
      /* Create a new rule and install it */
      createNewRuleAsset({ rule: OUTDATED_RULE });
      installAvailableRules();
      /* Create a second version of the rule, making it available for update */
      createNewRuleAsset({ rule: UPDATED_RULE });
      waitForRulesTableToBeLoaded();
      reload();
    });

    it('should update rule succesfully when user clicks on update callout', () => {
      updatePrebuiltRulesButtonClick();
      cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length', 1);
      cy.get(RULES_MANAGEMENT_TABLE).should('not.contain', OUTDATED_RULE['security-rule'].name);
      cy.get(RULES_MANAGEMENT_TABLE).contains(UPDATED_RULE['security-rule'].name);
    });

    it('should fail gracefully with toast error message when request to update rules fails', () => {
      /* Stub request to force rules update to fail */
      cy.intercept('PUT', '/api/detection_engine/rules/prepackaged', {
        statusCode: 500,
      }).as('updatePrebuiltRules');
      updatePrebuiltRulesButtonClickWithError();
      cy.wait('@updatePrebuiltRules');

      /* Assert that the rule has not been updated in the UI */
      cy.get(RULES_MANAGEMENT_TABLE).should('contain', OUTDATED_RULE['security-rule'].name);
      cy.get(RULES_MANAGEMENT_TABLE).should('not.contain', UPDATED_RULE['security-rule'].name);
      cy.get(UPDATE_PREBUILT_RULES_CALLOUT_BUTTON).should('not.have.attr', 'disabled');
      /* Toast error is generic and mentions "installation" instead of "update" for all cases */
      cy.get(TOASTER)
        .should('be.visible')
        .should('have.text', 'Failed to installed pre-packaged rules and timelines from elastic');
    });
  });
});
