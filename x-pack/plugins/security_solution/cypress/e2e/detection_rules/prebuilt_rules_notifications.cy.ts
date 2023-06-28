/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../helpers/rules';
import { ADD_ELASTIC_RULES_BTN, RULES_UPDATES_TAB } from '../../screens/alerts_detection_rules';
import { deleteFirstRule, waitForRulesTableToBeLoaded } from '../../tasks/alerts_detection_rules';
import {
  excessivelyInstallAllPrebuiltRules,
  createNewRuleAsset,
  preventPrebuiltRulesPackageInstallation,
} from '../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState, deleteAlertsAndRules, reload } from '../../tasks/common';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';

describe('Detection rules, Prebuilt Rules Installation and Update workflow', () => {
  beforeEach(() => {
    login();
    /* Make sure persisted rules table state is cleared */
    resetRulesTableState();
    deleteAlertsAndRules();
    /* Prevent security_detection_engine from being installed; install assets manually */
    preventPrebuiltRulesPackageInstallation();
    createNewRuleAsset({
      rule: createRuleAssetSavedObject({
        name: 'Test rule 1',
        rule_id: 'rule_1',
      }),
    });
  });

  describe('Rules installation notification when no rules have been installed', () => {
    beforeEach(() => {
      visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    });

    it('should notify user about prebuilt rules available for installation', () => {
      cy.get(ADD_ELASTIC_RULES_BTN).should('be.visible');
    });
  });

  describe('No notifications', () => {
    it('should display no install or update notifications when latest rules are installed', () => {
      /* Install current available rules */
      excessivelyInstallAllPrebuiltRules();
      visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
      waitForRulesTableToBeLoaded();

      /* Assert that there are no installation or update notifications */
      /* Add Elastic Rules button and Rule Upgrade tabs should not contain a number badge */
      cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', 'Add Elastic rules');
      cy.get(RULES_UPDATES_TAB).should('have.text', 'Rule Updates');
    });
  });

  describe('Rule installation notification when at least one rule already installed', () => {
    beforeEach(() => {
      excessivelyInstallAllPrebuiltRules();
      /* Create new rule assets with a different rule_id as the one that was */
      /* installed before in order to trigger the installation notification */
      createNewRuleAsset({
        rule: createRuleAssetSavedObject({
          name: 'Test rule 2',
          rule_id: 'rule_2',
        }),
      });
      createNewRuleAsset({
        rule: createRuleAssetSavedObject({
          name: 'Test rule 3',
          rule_id: 'rule_3',
        }),
      });
      visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
      reload();
      waitForRulesTableToBeLoaded();
    });

    it('should notify user about prebuilt rules package available for installation', () => {
      const numberOfAvailableRules = 2;
      cy.get(ADD_ELASTIC_RULES_BTN).should('be.visible');
      cy.get(ADD_ELASTIC_RULES_BTN).should(
        'have.text',
        `Add Elastic rules${numberOfAvailableRules}`
      );
    });

    it('should notify user a rule is again available for installation if it is deleted', () => {
      /* Install available rules, assert that the notification is gone */
      /* then delete one rule and assert that the notification is back */
      excessivelyInstallAllPrebuiltRules();
      reload();
      deleteFirstRule();
      cy.get(ADD_ELASTIC_RULES_BTN).should('be.visible');
      cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', `Add Elastic rules${1}`);
    });
  });

  describe('Rule update notification', () => {
    beforeEach(() => {
      excessivelyInstallAllPrebuiltRules();
      /* Create new rule asset with the same rule_id as the one that was installed  */
      /* but with a higher version, in order to trigger the update notification     */
      createNewRuleAsset({
        rule: createRuleAssetSavedObject({
          name: 'Test rule 1.1 (updated)',
          rule_id: 'rule_1',
          version: 2,
        }),
      });
      visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
      waitForRulesTableToBeLoaded();
      reload();
    });

    it('should notify user about prebuilt rules package available for update', () => {
      cy.get(RULES_UPDATES_TAB).should('be.visible');
      cy.get(RULES_UPDATES_TAB).should('have.text', `Rule Updates${1}`);
    });
  });
});
