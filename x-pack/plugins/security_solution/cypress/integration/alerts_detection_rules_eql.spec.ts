/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { eqlRule } from '../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  SEVERITY,
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
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRulesToBeLoaded,
} from '../tasks/alerts_detection_rules';
import {
  createAndActivateRule,
  fillAboutRuleAndContinue,
  selectEqlRuleType,
  fillDefineEqlRuleAndContinue,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Detection rules, EQL', () => {
  before(() => {
    esArchiverLoad('timeline');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Creates and activates a new EQL rule', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    selectEqlRuleType();
    fillDefineEqlRuleAndContinue(eqlRule);
    fillAboutRuleAndContinue(eqlRule);
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
    cy.get(RULE_NAME).invoke('text').should('eql', eqlRule.name);
    cy.get(RISK_SCORE).invoke('text').should('eql', eqlRule.riskScore);
    cy.get(SEVERITY).invoke('text').should('eql', eqlRule.severity);
    cy.get('[data-test-subj="rule-switch"]').should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    let expectedUrls = '';
    eqlRule.referenceUrls.forEach((url) => {
      expectedUrls = expectedUrls + url;
    });
    let expectedFalsePositives = '';
    eqlRule.falsePositivesExamples.forEach((falsePositive) => {
      expectedFalsePositives = expectedFalsePositives + falsePositive;
    });
    let expectedTags = '';
    eqlRule.tags.forEach((tag) => {
      expectedTags = expectedTags + tag;
    });
    let expectedMitre = '';
    eqlRule.mitre.forEach((mitre) => {
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

    cy.get(RULE_NAME_HEADER).invoke('text').should('eql', `${eqlRule.name} Beta`);

    cy.get(ABOUT_RULE_DESCRIPTION).invoke('text').should('eql', eqlRule.description);
    cy.get(ABOUT_STEP).eq(ABOUT_SEVERITY).invoke('text').should('eql', eqlRule.severity);
    cy.get(ABOUT_STEP).eq(ABOUT_RISK).invoke('text').should('eql', eqlRule.riskScore);
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
      .should('eql', `${eqlRule.customQuery} `);
    cy.get(DEFINITION_STEP).eq(2).invoke('text').should('eql', 'Event Correlation');
    cy.get(DEFINITION_STEP).eq(DEFINITION_TIMELINE).invoke('text').should('eql', 'None');

    cy.get(SCHEDULE_STEP).eq(SCHEDULE_RUNS).invoke('text').should('eql', '5m');
    cy.get(SCHEDULE_STEP).eq(SCHEDULE_LOOPBACK).invoke('text').should('eql', '1m');
  });
});
