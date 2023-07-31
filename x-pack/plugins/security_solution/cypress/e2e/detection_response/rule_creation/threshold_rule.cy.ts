/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThresholdRule } from '../../../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RULES_MANAGEMENT_TABLE,
  RULE_NAME,
} from '../../../screens/alerts_detection_rules';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import { expectNumberOfRules, goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineThresholdRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectThresholdRuleType,
} from '../../../tasks/create_new_rule';
import { login, visitWithoutDateRange } from '../../../tasks/login';

import { RULE_CREATION } from '../../../urls/navigation';

describe('Threshold rule', () => {
  const rule = getNewThresholdRule();

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visitWithoutDateRange(RULE_CREATION);
  });

  it('Creates and enables a new threshold rule', () => {
    selectThresholdRuleType();
    fillDefineThresholdRuleAndContinue(rule);
    fillAboutRuleAndContinue(rule);
    fillScheduleRuleAndContinue(rule);
    createAndEnableRule();

    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

    expectNumberOfRules(RULES_MANAGEMENT_TABLE, 1);

    cy.get(RULE_NAME).should('have.text', rule.name);

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
  });
});
