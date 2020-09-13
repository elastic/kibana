/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newOverrideRule } from '../objects/rule';
import {
  NUMBER_OF_ALERTS,
  ALERT_RULE_NAME,
  ALERT_RULE_VERSION,
  ALERT_RULE_METHOD,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_RISK_SCORE,
} from '../screens/alerts';

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
  ABOUT_OVERRIDE_FALSE_POSITIVES,
  ABOUT_OVERRIDE_MITRE,
  ABOUT_OVERRIDE_NAME_OVERRIDE,
  ABOUT_OVERRIDE_RISK,
  ABOUT_OVERRIDE_RISK_OVERRIDE,
  ABOUT_OVERRIDE_SEVERITY_OVERRIDE,
  ABOUT_OVERRIDE_TAGS,
  ABOUT_OVERRIDE_TIMESTAMP_OVERRIDE,
  ABOUT_OVERRIDE_URLS,
  ABOUT_RULE_DESCRIPTION,
  ABOUT_SEVERITY,
  ABOUT_STEP,
  DEFINITION_CUSTOM_QUERY,
  DEFINITION_INDEX_PATTERNS,
  DEFINITION_TIMELINE,
  DEFINITION_STEP,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  RULE_ABOUT_DETAILS_HEADER_TOGGLE,
  RULE_NAME_HEADER,
  SCHEDULE_LOOKBACK,
  SCHEDULE_RUNS,
  SCHEDULE_STEP,
} from '../screens/rule_details';

import {
  goToManageAlertsDetectionRules,
  sortRiskScore,
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
  fillAboutRuleWithOverrideAndContinue,
  fillDefineCustomRuleWithImportedQueryAndContinue,
  fillScheduleRuleAndContinue,
  waitForTheRuleToBeExecuted,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { refreshPage } from '../tasks/security_header';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Detection rules, override', () => {
  before(() => {
    esArchiverLoad('timeline');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Creates and activates a new custom rule with override option', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    fillDefineCustomRuleWithImportedQueryAndContinue(newOverrideRule);
    fillAboutRuleWithOverrideAndContinue(newOverrideRule);
    fillScheduleRuleAndContinue(newOverrideRule);
    createAndActivateRule();

    esArchiverLoad('auditbeat');
    waitForTheRuleToBeExecuted(newOverrideRule);

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
    cy.get(RULE_NAME).invoke('text').should('eql', newOverrideRule.name);
    cy.get(RISK_SCORE).invoke('text').should('eql', newOverrideRule.riskScore);
    cy.get(SEVERITY).invoke('text').should('eql', newOverrideRule.severity);
    cy.get('[data-test-subj="rule-switch"]').should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    let expectedUrls = '';
    newOverrideRule.referenceUrls.forEach((url) => {
      expectedUrls = expectedUrls + url;
    });
    let expectedFalsePositives = '';
    newOverrideRule.falsePositivesExamples.forEach((falsePositive) => {
      expectedFalsePositives = expectedFalsePositives + falsePositive;
    });
    let expectedTags = '';
    newOverrideRule.tags.forEach((tag) => {
      expectedTags = expectedTags + tag;
    });
    let expectedMitre = '';
    newOverrideRule.mitre.forEach((mitre) => {
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

    cy.get(RULE_NAME_HEADER).invoke('text').should('eql', `${newOverrideRule.name} Beta`);

    cy.get(ABOUT_RULE_DESCRIPTION).invoke('text').should('eql', newOverrideRule.description);

    const expectedOverrideSeverities = ['Low', 'Medium', 'High', 'Critical'];

    cy.get(ABOUT_STEP).eq(ABOUT_SEVERITY).invoke('text').should('eql', newOverrideRule.severity);
    newOverrideRule.severityOverride.forEach((severity, i) => {
      cy.get(ABOUT_STEP)
        .eq(ABOUT_OVERRIDE_SEVERITY_OVERRIDE + i)
        .invoke('text')
        .should(
          'eql',
          `${severity.sourceField}:${severity.sourceValue}${expectedOverrideSeverities[i]}`
        );
    });

    cy.get(ABOUT_STEP)
      .eq(ABOUT_OVERRIDE_RISK)
      .invoke('text')
      .should('eql', newOverrideRule.riskScore);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_OVERRIDE_RISK_OVERRIDE)
      .invoke('text')
      .should('eql', `${newOverrideRule.riskOverride}signal.rule.risk_score`);
    cy.get(ABOUT_STEP).eq(ABOUT_OVERRIDE_URLS).invoke('text').should('eql', expectedUrls);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_OVERRIDE_FALSE_POSITIVES)
      .invoke('text')
      .should('eql', expectedFalsePositives);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_OVERRIDE_NAME_OVERRIDE)
      .invoke('text')
      .should('eql', newOverrideRule.nameOverride);
    cy.get(ABOUT_STEP).eq(ABOUT_OVERRIDE_MITRE).invoke('text').should('eql', expectedMitre);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_OVERRIDE_TIMESTAMP_OVERRIDE)
      .invoke('text')
      .should('eql', newOverrideRule.timestampOverride);
    cy.get(ABOUT_STEP).eq(ABOUT_OVERRIDE_TAGS).invoke('text').should('eql', expectedTags);

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
      .should('eql', `${newOverrideRule.customQuery} `);
    cy.get(DEFINITION_STEP).eq(DEFINITION_TIMELINE).invoke('text').should('eql', 'None');

    cy.get(SCHEDULE_STEP)
      .eq(SCHEDULE_RUNS)
      .invoke('text')
      .should('eql', `${newOverrideRule.runsEvery.interval}${newOverrideRule.runsEvery.type}`);
    cy.get(SCHEDULE_STEP)
      .eq(SCHEDULE_LOOKBACK)
      .invoke('text')
      .should('eql', `${newOverrideRule.lookBack.interval}${newOverrideRule.lookBack.type}`);

    refreshPage();

    cy.get(NUMBER_OF_ALERTS)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });
    cy.get(ALERT_RULE_NAME).first().should('have.text', 'auditbeat');
    cy.get(ALERT_RULE_VERSION).first().should('have.text', '1');
    cy.get(ALERT_RULE_METHOD).first().should('have.text', 'query');
    cy.get(ALERT_RULE_SEVERITY).first().should('have.text', 'critical');

    sortRiskScore();

    cy.get(ALERT_RULE_RISK_SCORE).first().should('have.text', '80');
  });
});
