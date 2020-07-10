/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CustomRule, MachineLearningRule, machineLearningRule } from '../objects/rule';
import {
  ABOUT_CONTINUE_BTN,
  ANOMALY_THRESHOLD_INPUT,
  ADD_FALSE_POSITIVE_BTN,
  ADD_REFERENCE_URL_BTN,
  ADVANCED_SETTINGS_BTN,
  CREATE_AND_ACTIVATE_BTN,
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  FALSE_POSITIVES_INPUT,
  IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK,
  INVESTIGATION_NOTES_TEXTAREA,
  MACHINE_LEARNING_DROPDOWN,
  MACHINE_LEARNING_LIST,
  MACHINE_LEARNING_TYPE,
  MITRE_BTN,
  MITRE_TACTIC,
  MITRE_TACTIC_DROPDOWN,
  MITRE_TECHNIQUES_INPUT,
  RISK_INPUT,
  REFERENCE_URLS_INPUT,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
  SCHEDULE_CONTINUE_BUTTON,
  SEVERITY_DROPDOWN,
  TAGS_INPUT,
} from '../screens/create_new_rule';
import { TIMELINE } from '../screens/timeline';

export const createAndActivateRule = () => {
  cy.get(SCHEDULE_CONTINUE_BUTTON).click({ force: true });
  cy.get(CREATE_AND_ACTIVATE_BTN).click({ force: true });
  cy.get(CREATE_AND_ACTIVATE_BTN).should('not.exist');
};

export const fillAboutRuleAndContinue = (rule: CustomRule | MachineLearningRule) => {
  cy.get(RULE_NAME_INPUT).type(rule.name, { force: true });
  cy.get(RULE_DESCRIPTION_INPUT).type(rule.description, { force: true });

  cy.get(SEVERITY_DROPDOWN).click({ force: true });
  cy.get(`#${rule.severity.toLowerCase()}`).click();

  cy.get(RISK_INPUT).clear({ force: true }).type(`${rule.riskScore}`, { force: true });

  rule.tags.forEach((tag) => {
    cy.get(TAGS_INPUT).type(`${tag}{enter}`, { force: true });
  });

  cy.get(ADVANCED_SETTINGS_BTN).click({ force: true });

  rule.referenceUrls.forEach((url, index) => {
    cy.get(REFERENCE_URLS_INPUT).eq(index).type(url, { force: true });
    cy.get(ADD_REFERENCE_URL_BTN).click({ force: true });
  });

  rule.falsePositivesExamples.forEach((falsePositive, index) => {
    cy.get(FALSE_POSITIVES_INPUT).eq(index).type(falsePositive, { force: true });
    cy.get(ADD_FALSE_POSITIVE_BTN).click({ force: true });
  });

  rule.mitre.forEach((mitre, index) => {
    cy.get(MITRE_TACTIC_DROPDOWN).eq(index).click({ force: true });
    cy.contains(MITRE_TACTIC, mitre.tactic).click();

    mitre.techniques.forEach((technique) => {
      cy.get(MITRE_TECHNIQUES_INPUT).eq(index).type(`${technique}{enter}`, { force: true });
    });

    cy.get(MITRE_BTN).click({ force: true });
  });

  cy.get(INVESTIGATION_NOTES_TEXTAREA).type(rule.note, { force: true });

  cy.get(ABOUT_CONTINUE_BTN).should('exist').click({ force: true });
};

export const fillDefineCustomRuleAndContinue = (rule: CustomRule) => {
  cy.get(CUSTOM_QUERY_INPUT).type(rule.customQuery);
  cy.get(CUSTOM_QUERY_INPUT).invoke('text').should('eq', rule.customQuery);
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });

  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

export const fillDefineCustomRuleWithImportedQueryAndContinue = (rule: CustomRule) => {
  cy.get(IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK).click();
  cy.get(TIMELINE(rule.timelineId)).click();
  cy.get(CUSTOM_QUERY_INPUT).invoke('text').should('eq', rule.customQuery);
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });

  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

export const fillDefineMachineLearningRuleAndContinue = (rule: MachineLearningRule) => {
  cy.get(MACHINE_LEARNING_DROPDOWN).click({ force: true });
  cy.contains(MACHINE_LEARNING_LIST, rule.machineLearningJob).click();
  cy.get(ANOMALY_THRESHOLD_INPUT).type(`{selectall}${machineLearningRule.anomalyScoreThreshold}`, {
    force: true,
  });
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });

  cy.get(MACHINE_LEARNING_DROPDOWN).should('not.exist');
};

export const selectMachineLearningRuleType = () => {
  cy.get(MACHINE_LEARNING_TYPE).click({ force: true });
};
