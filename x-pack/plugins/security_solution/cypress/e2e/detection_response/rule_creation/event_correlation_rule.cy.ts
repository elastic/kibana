/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULES_ROW,
  CUSTOM_RULES_BTN,
  RULES_MANAGEMENT_TABLE,
  RULE_NAME,
} from '../../../screens/alerts_detection_rules';
import { getEqlRule, getEqlSequenceRule } from '../../../objects/rule';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import { expectNumberOfRules, goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineEqlRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectEqlRuleType,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';

import { RULE_CREATION } from '../../../urls/navigation';

describe('EQL rules', () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    visit(RULE_CREATION);
  });

  describe('EQL', () => {
    const rule = getEqlRule();
    const expectedNumberOfRules = 1;

    it('Creates and enables a new EQL rule', function () {
      selectEqlRuleType();
      fillDefineEqlRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createAndEnableRule();

      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      expectNumberOfRules(RULES_MANAGEMENT_TABLE, expectedNumberOfRules);

      cy.get(RULE_NAME).should('have.text', rule.name);

      goToRuleDetails();

      cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
    });
  });

  describe('Sequence EQL', () => {
    const rule = getEqlSequenceRule();
    const expectedNumberOfRules = 1;

    it('Creates and enables a new EQL rule with a sequence', function () {
      selectEqlRuleType();
      fillDefineEqlRuleAndContinue(rule);
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
});
