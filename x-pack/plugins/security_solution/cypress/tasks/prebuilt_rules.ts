/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_ADD_PATH, RULES_UPDATES } from '../../common/constants';
import {
  ADD_ELASTIC_RULES_BTN,
  RULES_ROW,
  RULES_UPDATES_TAB,
  RULES_UPDATES_TABLE,
  UPGRADE_ALL_RULES_BUTTON,
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

export const assertRuleUpgradeAvailableAndUpgradeAll = (rule: typeof SAMPLE_PREBUILT_RULE) => {
  cy.get(RULES_UPDATES_TABLE).find(RULES_ROW).should('have.length', 1);
  cy.get(RULES_UPDATES_TABLE).contains(rule['security-rule'].name);
  cy.get(UPGRADE_ALL_RULES_BUTTON).click();
  cy.wait('@updatePrebuiltRules');
};
