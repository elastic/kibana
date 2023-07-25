/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import {
  CUSTOM_RULES_BTN,
  RULE_NAME,
  RULES_ROW,
  RULES_MANAGEMENT_TABLE,
} from '../../../screens/alerts_detection_rules';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillDefineCustomRuleAndContinue,
  fillAboutRuleAndContinue,
  fillScheduleRuleAndContinue,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';

import { RULE_CREATION } from '../../../urls/navigation';

describe('Custom query rule', () => {
  const expectedNumberOfRules = 1;
  const rule = getNewRule();

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
  });

  it('Creates and enables a rule', function () {
    visit(RULE_CREATION);
    fillDefineCustomRuleAndContinue(rule);
    fillAboutRuleAndContinue(rule);
    fillScheduleRuleAndContinue(rule);
    createAndEnableRule();

    cy.log('Asserting we have a new rule created');
    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

    cy.log('Asserting rule view in rules list');
    cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length', expectedNumberOfRules);
    cy.get(RULE_NAME).should('have.text', rule.name);

    goToRuleDetails();

    cy.log('Asserting rule details');
    cy.get(RULE_NAME_HEADER).should('contain', rule.name);
  });
});
