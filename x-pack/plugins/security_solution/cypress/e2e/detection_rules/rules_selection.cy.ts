/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SELECTED_RULES_NUMBER_LABEL,
  SELECT_ALL_RULES_BTN,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
} from '../../screens/alerts_detection_rules';
import {
  loadPrebuiltDetectionRules,
  selectNumberOfRules,
  unselectNumberOfRules,
  waitForPrebuiltDetectionRulesToBeLoaded,
} from '../../tasks/alerts_detection_rules';
import { getAvailablePrebuiltRulesCount } from '../../tasks/api_calls/prebuilt_rules';
import { cleanKibana } from '../../tasks/common';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Rules selection', () => {
  beforeEach(() => {
    cleanKibana();
    login();
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
  });

  it('should correctly update the selection label when rules are individually selected and unselected', () => {
    loadPrebuiltDetectionRules();
    waitForPrebuiltDetectionRulesToBeLoaded();

    selectNumberOfRules(2);

    cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '2');

    unselectNumberOfRules(2);

    cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '0');
  });

  it('should correctly update the selection label when rules are bulk selected and then bulk un-selected', () => {
    loadPrebuiltDetectionRules();
    waitForPrebuiltDetectionRulesToBeLoaded();

    cy.get(SELECT_ALL_RULES_BTN).click();

    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', availablePrebuiltRulesCount);
    });

    const bulkSelectButton = cy.get(SELECT_ALL_RULES_BTN);

    // Un-select all rules via the Bulk Selection button from the Utility bar
    bulkSelectButton.click();

    // Current selection should be 0 rules
    cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '0');
    // Bulk selection button should be back to displaying all rules
    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      cy.get(SELECT_ALL_RULES_BTN).should('contain.text', availablePrebuiltRulesCount);
    });
  });

  it('should correctly update the selection label when rules are bulk selected and then unselected via the table select all checkbox', () => {
    loadPrebuiltDetectionRules();
    waitForPrebuiltDetectionRulesToBeLoaded();

    cy.get(SELECT_ALL_RULES_BTN).click();

    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', availablePrebuiltRulesCount);
    });

    // Un-select all rules via the Un-select All checkbox from the table
    cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();

    // Current selection should be 0 rules
    cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '0');
    // Bulk selection button should be back to displaying all rules
    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      cy.get(SELECT_ALL_RULES_BTN).should('contain.text', availablePrebuiltRulesCount);
    });
  });
});
