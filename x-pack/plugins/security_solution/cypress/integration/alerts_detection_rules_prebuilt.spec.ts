/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  COLLAPSED_ACTION_BTN,
  ELASTIC_RULES_BTN,
  RELOAD_PREBUILT_RULES_BTN,
  RULES_ROW,
  RULES_TABLE,
} from '../screens/alerts_detection_rules';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/alerts';
import {
  changeToThreeHundredRowsPerPage,
  deleteFirstRule,
  deleteSelectedRules,
  loadPrebuiltDetectionRules,
  reloadDeletedRules,
  selectNumberOfRules,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForPrebuiltDetectionRulesToBeLoaded,
  waitForRulesToBeLoaded,
} from '../tasks/alerts_detection_rules';
import { esArchiverLoadEmptyKibana, esArchiverUnloadEmptyKibana } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

import { totalNumberOfPrebuiltRules } from '../objects/rule';

describe('Alerts rules, prebuilt rules', () => {
  before(() => {
    esArchiverLoadEmptyKibana();
  });

  after(() => {
    esArchiverUnloadEmptyKibana();
  });

  it('Loads prebuilt rules', () => {
    const expectedNumberOfRules = totalNumberOfPrebuiltRules;
    const expectedElasticRulesBtnText = `Elastic rules (${expectedNumberOfRules})`;

    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    loadPrebuiltDetectionRules();
    waitForPrebuiltDetectionRulesToBeLoaded();

    cy.get(ELASTIC_RULES_BTN).invoke('text').should('eql', expectedElasticRulesBtnText);

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });
  });
});

describe('Deleting prebuilt rules', () => {
  beforeEach(() => {
    const expectedNumberOfRules = totalNumberOfPrebuiltRules;
    const expectedElasticRulesBtnText = `Elastic rules (${expectedNumberOfRules})`;

    esArchiverLoadEmptyKibana();
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    loadPrebuiltDetectionRules();
    waitForPrebuiltDetectionRulesToBeLoaded();

    cy.get(ELASTIC_RULES_BTN).invoke('text').should('eql', expectedElasticRulesBtnText);

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });
  });

  afterEach(() => {
    esArchiverUnloadEmptyKibana();
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

    deleteFirstRule();
    cy.reload();
    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get(ELASTIC_RULES_BTN)
      .invoke('text')
      .should('eql', `Elastic rules (${expectedNumberOfRulesAfterDeletion})`);
    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRulesAfterDeletion);
    });
    cy.get(RELOAD_PREBUILT_RULES_BTN).should('exist');
    cy.get(RELOAD_PREBUILT_RULES_BTN)
      .invoke('text')
      .should('eql', 'Install 1 Elastic prebuilt rule ');

    reloadDeletedRules();

    cy.get(RELOAD_PREBUILT_RULES_BTN).should('not.exist');

    cy.reload();
    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRulesAfterRecovering);
    });
    cy.get(ELASTIC_RULES_BTN)
      .invoke('text')
      .should('eql', `Elastic rules (${expectedNumberOfRulesAfterRecovering})`);
  });

  it('Deletes and recovers more than one rule', () => {
    const numberOfRulesToBeSelected = 2;
    const expectedNumberOfRulesAfterDeletion = totalNumberOfPrebuiltRules - 2;
    const expectedNumberOfRulesAfterRecovering = totalNumberOfPrebuiltRules;

    selectNumberOfRules(numberOfRulesToBeSelected);
    deleteSelectedRules();
    cy.reload();
    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get(RELOAD_PREBUILT_RULES_BTN).should('exist');
    cy.get(RELOAD_PREBUILT_RULES_BTN)
      .invoke('text')
      .should('eql', `Install ${numberOfRulesToBeSelected} Elastic prebuilt rules `);
    cy.get(ELASTIC_RULES_BTN)
      .invoke('text')
      .should('eql', `Elastic rules (${expectedNumberOfRulesAfterDeletion})`);
    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRulesAfterDeletion);
    });

    reloadDeletedRules();

    cy.get(RELOAD_PREBUILT_RULES_BTN).should('not.exist');

    cy.reload();
    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRulesAfterRecovering);
    });
    cy.get(ELASTIC_RULES_BTN)
      .invoke('text')
      .should('eql', `Elastic rules (${expectedNumberOfRulesAfterRecovering})`);
  });
});
