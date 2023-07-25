/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleFields } from '../../../data/detection_engine';
import { getTimeline } from '../../../objects/timeline';

import {
  CUSTOM_RULES_BTN,
  RULE_NAME,
  RULES_ROW,
  RULES_MANAGEMENT_TABLE,
} from '../../../screens/alerts_detection_rules';
import {
  ABOUT_CONTINUE_BTN,
  ABOUT_EDIT_BUTTON,
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  DEFINE_EDIT_BUTTON,
  RULE_NAME_INPUT,
  SCHEDULE_CONTINUE_BUTTON,
} from '../../../screens/create_new_rule';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  expandAdvancedSettings,
  fillDescription,
  fillFalsePositiveExamples,
  fillFrom,
  fillNote,
  fillReferenceUrls,
  fillRiskScore,
  fillRuleName,
  fillRuleTags,
  fillSeverity,
  fillThreat,
  fillThreatSubtechnique,
  fillThreatTechnique,
  importSavedQuery,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';

import { RULE_CREATION } from '../../../urls/navigation';

// This test is meant to test touching all the common various components in rule creation
// to ensure we don't miss any changes that maybe affect one of these more obscure UI components
// in the creation form. For any rule type specific functionalities, please include
// them in the relevant /rule_creation/[RULE_TYPE].cy.ts test.
describe('Common rule creation components', () => {
  const expectedNumberOfRules = 1;

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createTimeline(getTimeline())
      .then((response) => {
        return response.body.data.persistTimeline.timeline.savedObjectId;
      })
      .as('timelineId');
    login();
  });

  it('Creates and enables a rule', function () {
    visit(RULE_CREATION);

    cy.log('Filling define section');
    importSavedQuery(this.timelineId);
    cy.get(DEFINE_CONTINUE_BUTTON).click();

    cy.log('Filling about section');
    fillRuleName();
    fillDescription();
    fillSeverity();
    fillRiskScore();
    fillRuleTags();
    expandAdvancedSettings();
    fillReferenceUrls();
    fillFalsePositiveExamples();
    fillThreat();
    fillThreatTechnique();
    fillThreatSubtechnique();
    fillNote();
    cy.get(ABOUT_CONTINUE_BTN).click();

    cy.log('Filling schedule section');
    fillFrom();

    // expect define step to repopulate
    cy.get(DEFINE_EDIT_BUTTON).click();
    cy.get(CUSTOM_QUERY_INPUT).should('have.value', ruleFields.ruleQuery);
    cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();

    // expect about step to populate
    cy.get(ABOUT_EDIT_BUTTON).click();
    cy.get(RULE_NAME_INPUT).invoke('val').should('eql', ruleFields.ruleName);
    cy.get(ABOUT_CONTINUE_BTN).should('exist').click();
    cy.get(SCHEDULE_CONTINUE_BUTTON).click();

    createAndEnableRule();

    cy.log('Asserting we have a new rule created');
    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

    cy.log('Asserting rule view in rules list');
    cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length', expectedNumberOfRules);
    cy.get(RULE_NAME).should('have.text', ruleFields.ruleName);

    goToRuleDetails();

    cy.log('Asserting rule details');
    cy.get(RULE_NAME_HEADER).should('contain', ruleFields.ruleName);
  });
});
