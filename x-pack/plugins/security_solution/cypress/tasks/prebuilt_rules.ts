/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_ADD_PATH, RULES_UPDATES } from '../../common/constants';
import {
  ADD_ELASTIC_RULES_BTN,
  getUpgradeSingleRuleButtonByRuleId,
  RULES_UPDATES_TAB,
  RULES_UPDATES_TABLE,
  RULE_CHECKBOX,
  UPGRADE_ALL_RULES_BUTTON,
  UPGRADE_SELECTED_RULES_BUTTON,
} from '../screens/alerts_detection_rules';
import type { SAMPLE_PREBUILT_RULE } from './api_calls/prebuilt_rules';

export const addElasticRulesButtonClick = () => {
  cy.get(ADD_ELASTIC_RULES_BTN).click();
  cy.location('pathname').should('include', RULES_ADD_PATH);
};

export const ruleUpdatesTabClick = () => {
  cy.get(RULES_UPDATES_TAB).click();
  cy.location('pathname').should('include', RULES_UPDATES);
};

export const assertRuleUpgradeAvailableAndUpgradeOne = (rule: typeof SAMPLE_PREBUILT_RULE) => {
  cy.get(getUpgradeSingleRuleButtonByRuleId(rule['security-rule'].rule_id)).click();
  cy.get(RULES_UPDATES_TABLE).contains(rule['security-rule'].name);
  cy.get(UPGRADE_ALL_RULES_BUTTON).click();
  cy.wait('@updatePrebuiltRules');
};

export const assertRuleUpgradeAvailableAndUpgradeSelected = (
  rules: Array<typeof SAMPLE_PREBUILT_RULE>
) => {
  let i = 0;
  for (const rule of rules) {
    cy.get(RULE_CHECKBOX).eq(i).click();
    cy.get(RULES_UPDATES_TABLE).contains(rule['security-rule'].name);
    i++;
  }
  cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
  cy.wait('@updatePrebuiltRules');
};

export const assertRuleUpgradeAvailableAndAllInPage = (
  rules: Array<typeof SAMPLE_PREBUILT_RULE>
) => {
  for (const rule of rules) {
    cy.get(RULES_UPDATES_TABLE).contains(rule['security-rule'].name);
  }
  cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
  cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
  cy.wait('@updatePrebuiltRules');
};

export const assertRuleUpgradeAvailableAndUpgradeAll = (
  rules: Array<typeof SAMPLE_PREBUILT_RULE>
) => {
  for (const rule of rules) {
    cy.get(RULES_UPDATES_TABLE).contains(rule['security-rule'].name);
  }
  cy.get(UPGRADE_ALL_RULES_BUTTON).click();
  cy.wait('@updatePrebuiltRules');
};
