/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawRules } from '../../../server/lib/detection_engine/rules/prepackaged_rules';
import {
  COLLAPSED_ACTION_BTN,
  ELASTIC_RULES_BTN,
  pageSelector,
  RELOAD_PREBUILT_RULES_BTN,
  RULES_EMPTY_PROMPT,
  RULE_SWITCH,
  RULES_MONITORING_TABLE,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  RULES_TABLE,
} from '../../screens/alerts_detection_rules';
import type { Rule } from '../../../public/detections/containers/detection_engine/rules/types';
import {
  deleteFirstRule,
  deleteSelectedRules,
  loadPrebuiltDetectionRules,
  reloadDeletedRules,
  selectNumberOfRules,
  waitForPrebuiltDetectionRulesToBeLoaded,
  selectAllRules,
  confirmRulesDelete,
  enableSelectedRules,
  waitForRuleToChangeStatus,
  disableSelectedRules,
  changeRowsPerPageTo,
} from '../../tasks/alerts_detection_rules';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

import { totalNumberOfPrebuiltRules } from '../../objects/rule';
import { cleanKibana } from '../../tasks/common';

describe('Prebuilt rules', () => {
  before(() => {
    cleanKibana();
    login();
  });

  describe('Alerts rules, prebuilt rules', () => {
    it('Loads prebuilt rules', () => {
      cy.intercept('/api/detection_engine/rules/_find*', {
        data: rawRules,
        page: 1,
        perPage: 10000,
        total: rawRules.length,
      }).as('findRules');
      const rowsPerPage = 20;
      const expectedNumberOfRules = totalNumberOfPrebuiltRules;
      const expectedNumberOfPages = Math.ceil(totalNumberOfPrebuiltRules / rowsPerPage);
      const expectedElasticRulesBtnText = `Elastic rules (${expectedNumberOfRules})`;

      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      loadPrebuiltDetectionRules();
      waitForPrebuiltDetectionRulesToBeLoaded();

      cy.get(ELASTIC_RULES_BTN).should('have.text', expectedElasticRulesBtnText);

      // Assert that first page of rules is loaded with rules returned by the API
      cy.wait('@findRules').then(({ response }) => {
        const rules = response?.body.data.slice(0, rowsPerPage);
        rules.forEach((rule: Rule) => {
          cy.get(RULES_TABLE).should('contain', rule.name);
        });
      });

      changeRowsPerPageTo(rowsPerPage);

      cy.get(pageSelector(expectedNumberOfPages)).should('exist');
    });

    context('Rule monitoring table', () => {
      it('Allows to enable/disable all rules at once', () => {
        cy.get(RULES_MONITORING_TABLE).click();

        cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
        enableSelectedRules();
        waitForRuleToChangeStatus();
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

        selectAllRules();
        disableSelectedRules();
        waitForRuleToChangeStatus();
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'false');
      });
    });
  });

  describe('Actions with prebuilt rules', () => {
    before(() => {
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    });

    context('Rules table', () => {
      it('Allows to enable/disable all rules at once', () => {
        selectAllRules();
        enableSelectedRules();
        waitForRuleToChangeStatus();
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

        disableSelectedRules();
        waitForRuleToChangeStatus();
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
        const expectedNumberOfRulesAfterDeletion = totalNumberOfPrebuiltRules - 1;
        const expectedNumberOfRulesAfterRecovering = totalNumberOfPrebuiltRules;

        visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
        deleteFirstRule();

        cy.get(ELASTIC_RULES_BTN).should(
          'have.text',
          `Elastic rules (${expectedNumberOfRulesAfterDeletion})`
        );
        cy.get(RELOAD_PREBUILT_RULES_BTN).should('exist');
        cy.get(RELOAD_PREBUILT_RULES_BTN).should('have.text', 'Install 1 Elastic prebuilt rule ');

        reloadDeletedRules();

        cy.get(RELOAD_PREBUILT_RULES_BTN).should('not.exist');

        cy.get(ELASTIC_RULES_BTN).should(
          'have.text',
          `Elastic rules (${expectedNumberOfRulesAfterRecovering})`
        );
      });

      it('Deletes and recovers more than one rule', () => {
        const numberOfRulesToBeSelected = 2;
        const expectedNumberOfRulesAfterDeletion = totalNumberOfPrebuiltRules - 2;
        const expectedNumberOfRulesAfterRecovering = totalNumberOfPrebuiltRules;

        selectNumberOfRules(numberOfRulesToBeSelected);
        deleteSelectedRules();

        cy.get(RELOAD_PREBUILT_RULES_BTN).should('exist');
        cy.get(RELOAD_PREBUILT_RULES_BTN).should(
          'have.text',
          `Install ${numberOfRulesToBeSelected} Elastic prebuilt rules `
        );
        cy.get(ELASTIC_RULES_BTN).should(
          'have.text',
          `Elastic rules (${expectedNumberOfRulesAfterDeletion})`
        );

        reloadDeletedRules();

        cy.get(RELOAD_PREBUILT_RULES_BTN).should('not.exist');

        cy.get(ELASTIC_RULES_BTN).should(
          'have.text',
          `Elastic rules (${expectedNumberOfRulesAfterRecovering})`
        );
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
