/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COLLAPSED_ACTION_BTN,
  ELASTIC_RULES_BTN,
  pageSelector,
  RELOAD_PREBUILT_RULES_BTN,
  RULES_EMPTY_PROMPT,
  RULE_SWITCH,
  SHOWING_RULES_TEXT,
} from '../../screens/alerts_detection_rules';

import { goToManageAlertsDetectionRules, waitForAlertsIndexToBeCreated } from '../../tasks/alerts';
import {
  changeRowsPerPageTo100,
  deleteFirstRule,
  deleteSelectedRules,
  loadPrebuiltDetectionRules,
  reloadDeletedRules,
  selectNumberOfRules,
  waitForRulesTableToBeLoaded,
  waitForPrebuiltDetectionRulesToBeLoaded,
  selectAllRules,
  confirmRulesDelete,
  activateSelectedRules,
  waitForRuleToChangeStatus,
  deactivateSelectedRules,
  changeRowsPerPageTo,
} from '../../tasks/alerts_detection_rules';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';

import { cleanKibana } from '../../tasks/common';
import { totalNumberOfPrebuiltRules } from '../../objects/rule';

describe('Alerts rules, prebuilt rules', () => {
  beforeEach(() => {
    cleanKibana();
  });

  it('Loads prebuilt rules', () => {
    const rowsPerPage = 100;
    const expectedNumberOfRules = totalNumberOfPrebuiltRules;
    const expectedNumberOfPages = Math.ceil(totalNumberOfPrebuiltRules / rowsPerPage);

    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForRulesTableToBeLoaded();
    loadPrebuiltDetectionRules();
    waitForPrebuiltDetectionRulesToBeLoaded();

    // The result should be at least equal to the number of rules we have on disk
    // but could be greater than this number if there are additional cloud rules
    cy.get(ELASTIC_RULES_BTN)
      .first()
      .then((result) => {
        expect(+result.text().replace(/[^0-9]/g, '')).to.be.least(expectedNumberOfRules);
        expect(result.text()).to.match(/Elastic rules\s\([0-9]+\)/);
      });

    changeRowsPerPageTo(rowsPerPage);

    // The result should be at least equal to the number of rules we have on disk
    // but could be greater than this number if there are additional cloud rules
    cy.get(SHOWING_RULES_TEXT)
      .first()
      .then((result) => {
        expect(+result.text().replace(/[^0-9]/g, '')).to.be.least(expectedNumberOfRules);
        expect(result.text()).to.match(/Showing\s[0-9]+\srules/);
      });

    cy.get(pageSelector(expectedNumberOfPages)).should('exist');
  });
});

describe('Actions with prebuilt rules', () => {
  const expectedNumberOfRules = totalNumberOfPrebuiltRules;

  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForRulesTableToBeLoaded();
    loadPrebuiltDetectionRules();
    waitForPrebuiltDetectionRulesToBeLoaded();
  });

  it('Has the correct number of rules', () => {
    // The result should be at least equal to the number of rules we have on disk
    // but could be greater than this number if there are additional cloud rules
    cy.get(ELASTIC_RULES_BTN)
      .first()
      .then((result) => {
        expect(+result.text().replace(/[^0-9]/g, '')).to.be.least(expectedNumberOfRules);
        expect(result.text()).to.match(/Elastic rules\s\([0-9]+\)/);
      });
  });

  it('Allows to activate/deactivate all rules at once', () => {
    selectAllRules();
    activateSelectedRules();
    waitForRuleToChangeStatus();
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    selectAllRules();
    deactivateSelectedRules();
    waitForRuleToChangeStatus();
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'false');
  });

  it('Allows to delete all rules at once', () => {
    selectAllRules();
    deleteSelectedRules();
    confirmRulesDelete();
    cy.get(RULES_EMPTY_PROMPT).should('be.visible');
  });

  it('Does not allow to delete one rule when more than one is selected', () => {
    changeRowsPerPageTo100();

    const numberOfRulesToBeSelected = 2;
    selectNumberOfRules(numberOfRulesToBeSelected);

    cy.get(COLLAPSED_ACTION_BTN).each((collapsedItemActionBtn) => {
      cy.wrap(collapsedItemActionBtn).should('have.attr', 'disabled');
    });
  });

  it('Deletes and recovers one rule', () => {
    changeRowsPerPageTo100();

    const expectedNumberOfRulesAfterDeletion = totalNumberOfPrebuiltRules - 1;
    const expectedNumberOfRulesAfterRecovering = totalNumberOfPrebuiltRules;

    deleteFirstRule();
    cy.reload();
    changeRowsPerPageTo100();

    // The result should be at least equal to the number of rules we have on disk
    // but could be greater than this number if there are additional cloud rules.
    cy.get(ELASTIC_RULES_BTN)
      .first()
      .then((result) => {
        expect(+result.text().replace(/[^0-9]/g, '')).to.be.least(
          expectedNumberOfRulesAfterDeletion
        );
        expect(result.text()).to.match(/Elastic rules\s\([0-9]+\)/);
      });

    cy.get(RELOAD_PREBUILT_RULES_BTN).should('exist');
    cy.get(RELOAD_PREBUILT_RULES_BTN).should('have.text', 'Install 1 Elastic prebuilt rule ');

    reloadDeletedRules();

    cy.get(RELOAD_PREBUILT_RULES_BTN).should('not.exist');

    cy.reload();
    changeRowsPerPageTo100();

    // The result should be at least equal to the number of rules we have on disk
    // but could be greater than this number if there are additional cloud rules
    cy.get(ELASTIC_RULES_BTN)
      .first()
      .then((result) => {
        expect(+result.text().replace(/[^0-9]/g, '')).to.be.least(
          expectedNumberOfRulesAfterRecovering
        );
        expect(result.text()).to.match(/Elastic rules\s\([0-9]+\)/);
      });
  });

  it('Deletes and recovers more than one rule', () => {
    changeRowsPerPageTo100();

    const numberOfRulesToBeSelected = 2;
    const expectedNumberOfRulesAfterDeletion = totalNumberOfPrebuiltRules - 2;
    const expectedNumberOfRulesAfterRecovering = totalNumberOfPrebuiltRules;

    selectNumberOfRules(numberOfRulesToBeSelected);
    deleteSelectedRules();
    cy.reload();
    changeRowsPerPageTo100();

    cy.get(RELOAD_PREBUILT_RULES_BTN).should('exist');
    cy.get(RELOAD_PREBUILT_RULES_BTN).should(
      'have.text',
      `Install ${numberOfRulesToBeSelected} Elastic prebuilt rules `
    );

    // The result should be at least equal to the number of rules we have on disk
    // but could be greater than this number if there are additional cloud rules
    cy.get(ELASTIC_RULES_BTN)
      .first()
      .then((result) => {
        expect(+result.text().replace(/[^0-9]/g, '')).to.be.least(
          expectedNumberOfRulesAfterDeletion
        );
        expect(result.text()).to.match(/Elastic rules\s\([0-9]+\)/);
      });

    reloadDeletedRules();

    cy.get(RELOAD_PREBUILT_RULES_BTN).should('not.exist');

    cy.reload();
    changeRowsPerPageTo100();

    // The result should be at least equal to the number of rules we have on disk
    // but could be greater than this number if there are additional cloud rules
    cy.get(ELASTIC_RULES_BTN)
      .first()
      .then((result) => {
        expect(+result.text().replace(/[^0-9]/g, '')).to.be.least(
          expectedNumberOfRulesAfterRecovering
        );
        expect(result.text()).to.match(/Elastic rules\s\([0-9]+\)/);
      });
  });
});
