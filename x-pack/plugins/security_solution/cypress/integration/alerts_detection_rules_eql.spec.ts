/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { eqlRule, eqlSequenceRule, indexPatterns } from '../objects/rule';

import {
  ALERT_RULE_METHOD,
  ALERT_RULE_NAME,
  ALERT_RULE_RISK_SCORE,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_VERSION,
  NUMBER_OF_ALERTS,
} from '../screens/alerts';
import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  RULE_SWITCH,
  SEVERITY,
} from '../screens/alerts_detection_rules';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
  getDetails,
  removeExternalLinkText,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  MITRE_ATTACK_DETAILS,
  REFERENCE_URLS_DETAILS,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../screens/rule_details';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/alerts';
import {
  changeToThreeHundredRowsPerPage,
  deleteRule,
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRulesToBeLoaded,
} from '../tasks/alerts_detection_rules';
import {
  createAndActivateRule,
  fillAboutRuleAndContinue,
  fillDefineEqlRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectEqlRuleType,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { removeSignalsIndex } from '../tasks/common';

import { DETECTIONS_URL } from '../urls/navigation';

const expectedUrls = eqlRule.referenceUrls.join('');
const expectedFalsePositives = eqlRule.falsePositivesExamples.join('');
const expectedTags = eqlRule.tags.join('');
const expectedMitre = eqlRule.mitre
  .map(function (mitre) {
    return mitre.tactic + mitre.techniques.join('');
  })
  .join('');
const expectedNumberOfRules = 1;
const expectedNumberOfAlerts = 7;
const expectedNumberOfSequenceAlerts = 1;

describe('Detection rules, EQL', () => {
  beforeEach(() => {
    esArchiverLoad('timeline');
  });

  afterEach(() => {
    deleteRule();
    esArchiverUnload('timeline');
    removeSignalsIndex();
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
    fillScheduleRuleAndContinue(eqlRule);
    createAndActivateRule();

    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    filterByCustomRules();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
    });
    cy.get(RULE_NAME).should('have.text', eqlRule.name);
    cy.get(RISK_SCORE).should('have.text', eqlRule.riskScore);
    cy.get(SEVERITY).should('have.text', eqlRule.severity);
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('have.text', `${eqlRule.name}`);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', eqlRule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', eqlRule.severity);
      getDetails(RISK_SCORE_DETAILS).should('have.text', eqlRule.riskScore);
      getDetails(REFERENCE_URLS_DETAILS).should((details) => {
        expect(removeExternalLinkText(details.text())).equal(expectedUrls);
      });
      getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
      getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
        expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
      });
      getDetails(TAGS_DETAILS).should('have.text', expectedTags);
    });
    cy.get(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
    cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(INDEX_PATTERNS_DETAILS).should('have.text', indexPatterns.join(''));
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', eqlRule.customQuery);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Event Correlation');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
    });
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should(
        'have.text',
        `${eqlRule.runsEvery.interval}${eqlRule.runsEvery.type}`
      );
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
        'have.text',
        `${eqlRule.lookBack.interval}${eqlRule.lookBack.type}`
      );
    });

    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(NUMBER_OF_ALERTS).should('have.text', expectedNumberOfAlerts);
    cy.get(ALERT_RULE_NAME).first().should('have.text', eqlRule.name);
    cy.get(ALERT_RULE_VERSION).first().should('have.text', '1');
    cy.get(ALERT_RULE_METHOD).first().should('have.text', 'eql');
    cy.get(ALERT_RULE_SEVERITY).first().should('have.text', eqlRule.severity.toLowerCase());
    cy.get(ALERT_RULE_RISK_SCORE).first().should('have.text', eqlRule.riskScore);
  });

  it('Creates and activates a new EQL rule with a sequence', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    selectEqlRuleType();
    fillDefineEqlRuleAndContinue(eqlSequenceRule);
    fillAboutRuleAndContinue(eqlSequenceRule);
    fillScheduleRuleAndContinue(eqlSequenceRule);
    createAndActivateRule();

    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    filterByCustomRules();
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(NUMBER_OF_ALERTS).should('have.text', expectedNumberOfSequenceAlerts);
    cy.get(ALERT_RULE_NAME).first().should('have.text', eqlSequenceRule.name);
    cy.get(ALERT_RULE_VERSION).first().should('have.text', '1');
    cy.get(ALERT_RULE_METHOD).first().should('have.text', 'eql');
    cy.get(ALERT_RULE_SEVERITY).first().should('have.text', eqlSequenceRule.severity.toLowerCase());
    cy.get(ALERT_RULE_RISK_SCORE).first().should('have.text', eqlSequenceRule.riskScore);
  });
});
