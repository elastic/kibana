/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newThresholdRule } from '../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  SEVERITY,
} from '../screens/alerts_detection_rules';
import {
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  RULE_ABOUT_DETAILS_HEADER_TOGGLE,
  RULE_NAME_HEADER,
  getDescriptionForTitle,
  ABOUT_DETAILS,
  DEFINITION_DETAILS,
  SCHEDULE_DETAILS,
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
  fillDefineThresholdRuleAndContinue,
  selectThresholdRuleType,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Detection rules, threshold', () => {
  before(() => {
    esArchiverLoad('timeline');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Creates and activates a new threshold rule', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    selectThresholdRuleType();
    fillDefineThresholdRuleAndContinue(newThresholdRule);
    fillAboutRuleAndContinue(newThresholdRule);
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
    cy.get(RULE_NAME).invoke('text').should('eql', newThresholdRule.name);
    cy.get(RISK_SCORE).invoke('text').should('eql', newThresholdRule.riskScore);
    cy.get(SEVERITY).invoke('text').should('eql', newThresholdRule.severity);
    cy.get('[data-test-subj="rule-switch"]').should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    let expectedUrls = '';
    newThresholdRule.referenceUrls.forEach((url) => {
      expectedUrls = expectedUrls + url;
    });
    let expectedFalsePositives = '';
    newThresholdRule.falsePositivesExamples.forEach((falsePositive) => {
      expectedFalsePositives = expectedFalsePositives + falsePositive;
    });
    let expectedTags = '';
    newThresholdRule.tags.forEach((tag) => {
      expectedTags = expectedTags + tag;
    });
    let expectedMitre = '';
    newThresholdRule.mitre.forEach((mitre) => {
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

    cy.get(RULE_NAME_HEADER).invoke('text').should('eql', `${newThresholdRule.name} Beta`);

    cy.get(ABOUT_RULE_DESCRIPTION).invoke('text').should('eql', newThresholdRule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDescriptionForTitle('Severity').invoke('text').should('eql', newThresholdRule.severity);
      getDescriptionForTitle('Risk score').invoke('text').should('eql', newThresholdRule.riskScore);
      getDescriptionForTitle('Reference URLs').invoke('text').should('eql', expectedUrls);
      getDescriptionForTitle('False positive examples')
        .invoke('text')
        .should('eql', expectedFalsePositives);
      getDescriptionForTitle('MITRE ATT&CK').invoke('text').should('eql', expectedMitre);
      getDescriptionForTitle('Tags').invoke('text').should('eql', expectedTags);
    });

    cy.get(RULE_ABOUT_DETAILS_HEADER_TOGGLE).eq(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
    cy.get(ABOUT_INVESTIGATION_NOTES).invoke('text').should('eql', INVESTIGATION_NOTES_MARKDOWN);

    cy.get(DEFINITION_DETAILS).within(() => {
      getDescriptionForTitle('Index patterns')
        .invoke('text')
        .should('eql', expectedIndexPatterns.join(''));
      getDescriptionForTitle('Custom query')
        .invoke('text')
        .should('eql', `${newThresholdRule.customQuery} `);
      getDescriptionForTitle('Rule type').invoke('text').should('eql', 'Threshold');
      getDescriptionForTitle('Timeline template').invoke('text').should('eql', 'None');
      getDescriptionForTitle('Threshold')
        .invoke('text')
        .should(
          'eql',
          `Results aggregated by ${newThresholdRule.thresholdField} >= ${newThresholdRule.threshold}`
        );
    });

    cy.get(SCHEDULE_DETAILS).within(() => {
      getDescriptionForTitle('Runs every').invoke('text').should('eql', '5m');
      getDescriptionForTitle('Additional look-back time').invoke('text').should('eql', '1m');
    });
  });
});
