/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { machineLearningRule, totalNumberOfPrebuiltRulesInEsArchive } from '../objects/rule';

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
  ABOUT_RULE_DESCRIPTION,
  MACHINE_LEARNING_JOB_ID,
  MACHINE_LEARNING_JOB_STATUS,
  RULE_NAME_HEADER,
  getDescriptionForTitle,
  ABOUT_DETAILS,
  DEFINITION_DETAILS,
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
  fillDefineMachineLearningRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectMachineLearningRuleType,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Detection rules, machine learning', () => {
  before(() => {
    esArchiverLoad('prebuilt_rules_loaded');
  });

  after(() => {
    esArchiverUnload('prebuilt_rules_loaded');
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

    const expectedNumberOfRules = totalNumberOfPrebuiltRulesInEsArchive + 1;
    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    filterByCustomRules();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
    });
    cy.get(RULE_NAME).invoke('text').should('eql', machineLearningRule.name);
    cy.get(RISK_SCORE).invoke('text').should('eql', machineLearningRule.riskScore);
    cy.get(SEVERITY).invoke('text').should('eql', machineLearningRule.severity);
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    let expectedUrls = '';
    machineLearningRule.referenceUrls.forEach((url) => {
      expectedUrls = expectedUrls + url;
    });
    let expectedFalsePositives = '';
    machineLearningRule.falsePositivesExamples.forEach((falsePositive) => {
      expectedFalsePositives = expectedFalsePositives + falsePositive;
    });
    let expectedTags = '';
    machineLearningRule.tags.forEach((tag) => {
      expectedTags = expectedTags + tag;
    });
    let expectedMitre = '';
    machineLearningRule.mitre.forEach((mitre) => {
      expectedMitre = expectedMitre + mitre.tactic;
      mitre.techniques.forEach((technique) => {
        expectedMitre = expectedMitre + technique;
      });
    });

    cy.get(RULE_NAME_HEADER).invoke('text').should('eql', `${machineLearningRule.name} Beta`);

    cy.get(ABOUT_RULE_DESCRIPTION).invoke('text').should('eql', machineLearningRule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDescriptionForTitle('Severity').invoke('text').should('eql', machineLearningRule.severity);
      getDescriptionForTitle('Risk score')
        .invoke('text')
        .should('eql', machineLearningRule.riskScore);
      getDescriptionForTitle('Reference URLs').invoke('text').should('eql', expectedUrls);
      getDescriptionForTitle('False positive examples')
        .invoke('text')
        .should('eql', expectedFalsePositives);
      getDescriptionForTitle('MITRE ATT&CK').invoke('text').should('eql', expectedMitre);
      getDescriptionForTitle('Tags').invoke('text').should('eql', expectedTags);
    });

    cy.get(DEFINITION_DETAILS).within(() => {
      getDescriptionForTitle('Anomaly score')
        .invoke('text')
        .should('eql', machineLearningRule.anomalyScoreThreshold);
      getDescriptionForTitle('Anomaly score')
        .invoke('text')
        .should('eql', machineLearningRule.anomalyScoreThreshold);
      getDescriptionForTitle('Rule type').invoke('text').should('eql', 'Machine Learning');
      getDescriptionForTitle('Timeline template').invoke('text').should('eql', 'None');
      cy.get(MACHINE_LEARNING_JOB_STATUS).invoke('text').should('eql', 'Stopped');
      cy.get(MACHINE_LEARNING_JOB_ID)
        .invoke('text')
        .should('eql', machineLearningRule.machineLearningJob);
    });

    cy.get('[data-test-subj=schedule] [data-test-subj="listItemColumnStepRuleDescription"]').within(
      () => {
        getDescriptionForTitle('Runs every')
          .invoke('text')
          .should(
            'eql',
            `${machineLearningRule.runsEvery.interval}${machineLearningRule.runsEvery.type}`
          );
        getDescriptionForTitle('Additional look-back time')
          .invoke('text')
          .should(
            'eql',
            `${machineLearningRule.lookBack.interval}${machineLearningRule.lookBack.type}`
          );
      }
    );
  });
});
