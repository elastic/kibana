/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatMitreAttackDescription } from '../helpers/rules';
import { machineLearningRule } from '../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULE_SWITCH,
  RULES_ROW,
  RULES_TABLE,
  SEVERITY,
} from '../screens/alerts_detection_rules';
import {
  ABOUT_DETAILS,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  ANOMALY_SCORE_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
  getDetails,
  removeExternalLinkText,
  MACHINE_LEARNING_JOB_ID,
  MACHINE_LEARNING_JOB_STATUS,
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
  fillDefineMachineLearningRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectMachineLearningRuleType,
} from '../tasks/create_new_rule';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Detection rules, machine learning', () => {
  const expectedUrls = machineLearningRule.referenceUrls.join('');
  const expectedFalsePositives = machineLearningRule.falsePositivesExamples.join('');
  const expectedTags = machineLearningRule.tags.join('');
  const expectedMitre = formatMitreAttackDescription(machineLearningRule.mitre);
  const expectedNumberOfRules = 1;

  after(() => {
    deleteRule();
  });

  it('Creates and activates a new ml rule', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    selectMachineLearningRuleType();
    fillDefineMachineLearningRuleAndContinue(machineLearningRule);
    fillAboutRuleAndContinue(machineLearningRule);
    fillScheduleRuleAndContinue(machineLearningRule);
    createAndActivateRule();

    cy.get(CUSTOM_RULES_BTN).invoke('text').should('eql', 'Custom rules (1)');

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    filterByCustomRules();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
    });
    cy.get(RULE_NAME).should('have.text', machineLearningRule.name);
    cy.get(RISK_SCORE).should('have.text', machineLearningRule.riskScore);
    cy.get(SEVERITY).should('have.text', machineLearningRule.severity);
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('have.text', `${machineLearningRule.name}`);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', machineLearningRule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', machineLearningRule.severity);
      getDetails(RISK_SCORE_DETAILS).should('have.text', machineLearningRule.riskScore);
      getDetails(REFERENCE_URLS_DETAILS).should((details) => {
        expect(removeExternalLinkText(details.text())).equal(expectedUrls);
      });
      getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
      getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
        expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
      });
      getDetails(TAGS_DETAILS).should('have.text', expectedTags);
    });
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(ANOMALY_SCORE_DETAILS).should(
        'have.text',
        machineLearningRule.anomalyScoreThreshold
      );
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Machine Learning');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      cy.get(MACHINE_LEARNING_JOB_STATUS).should('have.text', 'Stopped');
      cy.get(MACHINE_LEARNING_JOB_ID).should('have.text', machineLearningRule.machineLearningJob);
    });
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should(
        'have.text',
        `${machineLearningRule.runsEvery.interval}${machineLearningRule.runsEvery.type}`
      );
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
        'have.text',
        `${machineLearningRule.lookBack.interval}${machineLearningRule.lookBack.type}`
      );
    });
  });
});
