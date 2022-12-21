/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COLLAPSED_ACTION_BTN,
  ELASTIC_RULES_BTN,
  LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN,
  RULES_EMPTY_PROMPT,
  RULES_MONITORING_TABLE,
  RULES_ROW,
  RULES_TABLE,
  RULE_SWITCH,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
} from '../../screens/alerts_detection_rules';
import {
  confirmRulesDelete,
  deleteFirstRule,
  deleteSelectedRules,
  disableSelectedRules,
  enableSelectedRules,
  loadPrebuiltDetectionRules,
  reloadDeletedRules,
  selectAllRules,
  selectNumberOfRules,
  waitForPrebuiltDetectionRulesToBeLoaded,
  waitForRuleToUpdate,
} from '../../tasks/alerts_detection_rules';
import { getAvailablePrebuiltRulesCount } from '../../tasks/api_calls/prebuilt_rules';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Prebuilt rules', () => {
  before(() => {
    cleanKibana();
    login();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    loadPrebuiltDetectionRules();
    waitForPrebuiltDetectionRulesToBeLoaded();
  });

  describe('Alerts rules, prebuilt rules', () => {
    it('Loads prebuilt rules', () => {
      // Check that the rules table contains rules
      cy.get(RULES_TABLE).find(RULES_ROW).should('have.length.gte', 1);

      // Check the correct count of prebuilt rules is displayed
      getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
        cy.get(ELASTIC_RULES_BTN).should(
          'have.text',
          `Elastic rules (${availablePrebuiltRulesCount})`
        );
      });
    });

    context('Rule monitoring table', () => {
      it('Allows to enable/disable all rules at once', () => {
        cy.get(RULES_MONITORING_TABLE).click();

        cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
        enableSelectedRules();
        waitForRuleToUpdate();
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

        selectAllRules();
        disableSelectedRules();
        waitForRuleToUpdate();
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'false');
      });
    });
  });

  describe('Actions with prebuilt rules', () => {
    context('Rules table', () => {
      it('Allows to enable/disable all rules at once', () => {
        selectAllRules();
        enableSelectedRules();
        waitForRuleToUpdate();
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

        disableSelectedRules();
        waitForRuleToUpdate();
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'false');
      });

      it('Does not allow to delete one rule when more than one is selected', () => {
        const numberOfRulesToBeSelected = 2;
        selectNumberOfRules(numberOfRulesToBeSelected);

        cy.get(COLLAPSED_ACTION_BTN).each((collapsedItemActionBtn) => {
          cy.wrap(collapsedItemActionBtn).should('have.attr', 'disabled');
        });
      });

      it('Deletes and recovers one rule', () => {
        getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
          const expectedNumberOfRulesAfterDeletion = availablePrebuiltRulesCount - 1;
          const expectedNumberOfRulesAfterRecovering = availablePrebuiltRulesCount;

          deleteFirstRule();

          cy.get(ELASTIC_RULES_BTN).should(
            'have.text',
            `Elastic rules (${expectedNumberOfRulesAfterDeletion})`
          );
          cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('exist');
          cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should(
            'have.text',
            'Install 1 Elastic prebuilt rule '
          );

          reloadDeletedRules();

          cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('not.exist');

          cy.get(ELASTIC_RULES_BTN).should(
            'have.text',
            `Elastic rules (${expectedNumberOfRulesAfterRecovering})`
          );
        });
      });

      it('Deletes and recovers more than one rule', () => {
        getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
          const numberOfRulesToBeSelected = 2;
          const expectedNumberOfRulesAfterDeletion = availablePrebuiltRulesCount - 2;
          const expectedNumberOfRulesAfterRecovering = availablePrebuiltRulesCount;

          selectNumberOfRules(numberOfRulesToBeSelected);
          deleteSelectedRules();

          cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('exist');
          cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should(
            'have.text',
            `Install ${numberOfRulesToBeSelected} Elastic prebuilt rules `
          );
          cy.get(ELASTIC_RULES_BTN).should(
            'have.text',
            `Elastic rules (${expectedNumberOfRulesAfterDeletion})`
          );

          reloadDeletedRules();

          cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('not.exist');

          cy.get(ELASTIC_RULES_BTN).should(
            'have.text',
            `Elastic rules (${expectedNumberOfRulesAfterRecovering})`
          );
        });
      });

      it('Allows to delete all rules at once', () => {
        selectAllRules();
        deleteSelectedRules();
        confirmRulesDelete();
        cy.get(RULES_EMPTY_PROMPT).should('be.visible');
      });
    });
  });
});
