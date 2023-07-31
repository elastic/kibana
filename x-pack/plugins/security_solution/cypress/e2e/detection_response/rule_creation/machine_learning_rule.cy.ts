/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMachineLearningRule } from '../../../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RULES_MANAGEMENT_TABLE,
  RULE_NAME,
  RULE_SWITCH,
} from '../../../screens/alerts_detection_rules';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import { expectNumberOfRules, goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { cleanKibana } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineMachineLearningRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectMachineLearningRuleType,
} from '../../../tasks/create_new_rule';
import { login, visitWithoutDateRange } from '../../../tasks/login';

import { RULE_CREATION } from '../../../urls/navigation';

describe('Machine learning', () => {
  const expectedNumberOfRules = 1;

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    visitWithoutDateRange(RULE_CREATION);
  });

  it('Creates and enables a new ml rule', () => {
    const mlRule = getMachineLearningRule();
    selectMachineLearningRuleType();
    fillDefineMachineLearningRuleAndContinue(mlRule);
    fillAboutRuleAndContinue(mlRule);
    fillScheduleRuleAndContinue(mlRule);
    createAndEnableRule();

    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

    expectNumberOfRules(RULES_MANAGEMENT_TABLE, expectedNumberOfRules);

    cy.get(RULE_NAME).should('have.text', mlRule.name);
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${mlRule.name}`);
  });
});
