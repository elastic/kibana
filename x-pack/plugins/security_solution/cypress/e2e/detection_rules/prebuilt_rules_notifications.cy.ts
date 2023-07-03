/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../helpers/rules';
import {
  LOAD_PREBUILT_RULES_BTN,
  LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN,
  UPDATE_PREBUILT_RULES_CALLOUT,
} from '../../screens/alerts_detection_rules';
import { deleteFirstRule, waitForRulesTableToBeLoaded } from '../../tasks/alerts_detection_rules';
import { installAvailableRules, createNewRuleAsset } from '../../tasks/api_calls/prebuilt_rules';
import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../tasks/common';
import { esArchiverResetKibana } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';

describe('Detection rules, Prebuilt Rules Installation and Update workflow', () => {
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
    deleteAlertsAndRules();
    esArchiverResetKibana();

    // Prevent the installation of the package
    // `security_detection_engine` from Fleet
    cy.intercept('POST', '/api/fleet/epm/packages/_bulk?prerelease=true', {}).as(
      'getPrebuiltRules'
    );
    createNewRuleAsset({
      rule: createRuleAssetSavedObject({
        name: 'Test rule 1',
        rule_id: 'rule_1',
      }),
    });
    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
  });

  describe('Rules installation notification when no rules have been installed', () => {
    beforeEach(() => {
      waitForRulesTableToBeLoaded();
    });

    it('should notify user about prebuilt rules package available for installation', () => {
      cy.get(LOAD_PREBUILT_RULES_BTN).should('be.visible');
      cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('be.visible');
    });
  });

  describe('No notifications', () => {
    it('should display no install or update notifications when latest rules are installed', () => {
      // Install current available rules
      installAvailableRules();

      waitForRulesTableToBeLoaded();

      // Assert that there are no installation or update notifications
      cy.get(LOAD_PREBUILT_RULES_BTN).should('not.exist');
      cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('not.exist');
      cy.get(UPDATE_PREBUILT_RULES_CALLOUT).should('not.exist');
    });
  });

  describe.only('Rule installation notification when at least one rule already installed', () => {
    beforeEach(() => {
      installAvailableRules();
      // Create new rule asset with a different rule_id as the one that was
      // installed before in order to trigger the installation notification
      createNewRuleAsset({
        rule: createRuleAssetSavedObject({
          name: 'Test rule 2',
          rule_id: 'rule_2',
        }),
      });
      waitForRulesTableToBeLoaded();
    });

    it('should notify user about prebuilt rules package available for installation', () => {
      cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('be.visible');
    });

    it('should notify user a rule is again available for installation if it is deleted', () => {
      // Install a second rule, assert that the notification is gone
      // then delete the rule and assert that the notification is back
      cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).click();
      cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('not.exist');
      deleteFirstRule();
      cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('be.visible');
    });
  });

  describe('Rule update notification', () => {
    beforeEach(() => {
      installAvailableRules();
      // Create new rule asset with the same rule_id as the one that was installed
      // but with a higher version, in order to trigger the update notification
      createNewRuleAsset({
        rule: createRuleAssetSavedObject({
          name: 'Test rule 1.1 (updated)',
          rule_id: 'rule_1',
          version: 2,
        }),
      });
      waitForRulesTableToBeLoaded();
    });

    it('should notify user about prebuilt rules package available for update', () => {
      cy.get(UPDATE_PREBUILT_RULES_CALLOUT).should('be.visible');
    });
  });
});
