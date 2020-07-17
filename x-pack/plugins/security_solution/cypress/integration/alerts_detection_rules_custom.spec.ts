/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newRule } from '../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  SEVERITY,
  SHOWING_RULES_TEXT,
} from '../screens/alerts_detection_rules';
import {
  ABOUT_FALSE_POSITIVES,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_MITRE,
  ABOUT_RISK,
  ABOUT_RULE_DESCRIPTION,
  ABOUT_SEVERITY,
  ABOUT_STEP,
  ABOUT_TAGS,
  ABOUT_URLS,
  DEFINITION_CUSTOM_QUERY,
  DEFINITION_INDEX_PATTERNS,
  DEFINITION_TIMELINE,
  DEFINITION_STEP,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  RULE_ABOUT_DETAILS_HEADER_TOGGLE,
  RULE_NAME_HEADER,
  SCHEDULE_LOOPBACK,
  SCHEDULE_RUNS,
  SCHEDULE_STEP,
} from '../screens/rule_details';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/alerts';
import {
  changeToThreeHundredRowsPerPage,
  deleteFirstRule,
  deleteSelectedRules,
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  selectNumberOfRules,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRulesToBeLoaded,
} from '../tasks/alerts_detection_rules';
import {
  createAndActivateRule,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleWithImportedQueryAndContinue,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Detection rules, custom', () => {
  before(() => {
    esArchiverLoad('timeline');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Creates and activates a new custom rule', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    fillDefineCustomRuleWithImportedQueryAndContinue(newRule);
    fillAboutRuleAndContinue(newRule);
    createAndActivateRule();

    cy.get(CUSTOM_RULES_BTN).invoke('text').should('eql', 'Custom rules (1)');

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    const expectedNumberOfRules = 1;
    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    filterByCustomRules();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
    });
    cy.get(RULE_NAME).invoke('text').should('eql', newRule.name);
    cy.get(RISK_SCORE).invoke('text').should('eql', newRule.riskScore);
    cy.get(SEVERITY).invoke('text').should('eql', newRule.severity);
    cy.get('[data-test-subj="rule-switch"]').should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    let expectedUrls = '';
    newRule.referenceUrls.forEach((url) => {
      expectedUrls = expectedUrls + url;
    });
    let expectedFalsePositives = '';
    newRule.falsePositivesExamples.forEach((falsePositive) => {
      expectedFalsePositives = expectedFalsePositives + falsePositive;
    });
    let expectedTags = '';
    newRule.tags.forEach((tag) => {
      expectedTags = expectedTags + tag;
    });
    let expectedMitre = '';
    newRule.mitre.forEach((mitre) => {
      expectedMitre = expectedMitre + mitre.tactic;
      mitre.techniques.forEach((technique) => {
        expectedMitre = expectedMitre + technique;
      });
    });
    const expectedIndexPatterns = [
      'apm-*-transaction*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'logs-*',
      'packetbeat-*',
      'winlogbeat-*',
    ];

    cy.get(RULE_NAME_HEADER).invoke('text').should('eql', `${newRule.name} Beta`);

    cy.get(ABOUT_RULE_DESCRIPTION).invoke('text').should('eql', newRule.description);
    cy.get(ABOUT_STEP).eq(ABOUT_SEVERITY).invoke('text').should('eql', newRule.severity);
    cy.get(ABOUT_STEP).eq(ABOUT_RISK).invoke('text').should('eql', newRule.riskScore);
    cy.get(ABOUT_STEP).eq(ABOUT_URLS).invoke('text').should('eql', expectedUrls);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_FALSE_POSITIVES)
      .invoke('text')
      .should('eql', expectedFalsePositives);
    cy.get(ABOUT_STEP).eq(ABOUT_MITRE).invoke('text').should('eql', expectedMitre);
    cy.get(ABOUT_STEP).eq(ABOUT_TAGS).invoke('text').should('eql', expectedTags);

    cy.get(RULE_ABOUT_DETAILS_HEADER_TOGGLE).eq(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
    cy.get(ABOUT_INVESTIGATION_NOTES).invoke('text').should('eql', INVESTIGATION_NOTES_MARKDOWN);

    cy.get(DEFINITION_INDEX_PATTERNS).then((patterns) => {
      cy.wrap(patterns).each((pattern, index) => {
        cy.wrap(pattern).invoke('text').should('eql', expectedIndexPatterns[index]);
      });
    });
    cy.get(DEFINITION_STEP)
      .eq(DEFINITION_CUSTOM_QUERY)
      .invoke('text')
      .should('eql', `${newRule.customQuery} `);
    cy.get(DEFINITION_STEP).eq(DEFINITION_TIMELINE).invoke('text').should('eql', 'None');

    cy.get(SCHEDULE_STEP).eq(SCHEDULE_RUNS).invoke('text').should('eql', '5m');
    cy.get(SCHEDULE_STEP).eq(SCHEDULE_LOOPBACK).invoke('text').should('eql', '1m');
  });
});

describe('Deletes custom rules', () => {
  beforeEach(() => {
    esArchiverLoad('custom_rules');
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
  });

  after(() => {
    esArchiverUnload('custom_rules');
  });

  it('Deletes one rule', () => {
    cy.get(RULES_TABLE)
      .find(RULES_ROW)
      .then((rules) => {
        const initialNumberOfRules = rules.length;
        const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

        cy.get(SHOWING_RULES_TEXT)
          .invoke('text')
          .should('eql', `Showing ${initialNumberOfRules} rules`);

        deleteFirstRule();
        waitForRulesToBeLoaded();

        cy.get(RULES_TABLE).then(($table) => {
          cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRulesAfterDeletion);
        });
        cy.get(SHOWING_RULES_TEXT)
          .invoke('text')
          .should('eql', `Showing ${expectedNumberOfRulesAfterDeletion} rules`);
        cy.get(CUSTOM_RULES_BTN)
          .invoke('text')
          .should('eql', `Custom rules (${expectedNumberOfRulesAfterDeletion})`);
      });
  });

  it('Deletes more than one rule', () => {
    cy.get(RULES_TABLE)
      .find(RULES_ROW)
      .then((rules) => {
        const initialNumberOfRules = rules.length;
        const numberOfRulesToBeDeleted = 3;
        const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - numberOfRulesToBeDeleted;

        selectNumberOfRules(numberOfRulesToBeDeleted);
        deleteSelectedRules();
        waitForRulesToBeLoaded();

        cy.get(RULES_TABLE).then(($table) => {
          cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRulesAfterDeletion);
        });
        cy.get(SHOWING_RULES_TEXT)
          .invoke('text')
          .should('eql', `Showing ${expectedNumberOfRulesAfterDeletion} rule`);
        cy.get(CUSTOM_RULES_BTN)
          .invoke('text')
          .should('eql', `Custom rules (${expectedNumberOfRulesAfterDeletion})`);
      });
  });
});
