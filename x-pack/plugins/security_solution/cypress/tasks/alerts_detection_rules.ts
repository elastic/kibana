/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BULK_ACTIONS_BTN,
  COLLAPSED_ACTION_BTN,
  CREATE_NEW_RULE_BTN,
  CUSTOM_RULES_BTN,
  DELETE_RULE_ACTION_BTN,
  DELETE_RULE_BULK_BTN,
  LOAD_PREBUILT_RULES_BTN,
  LOADING_INITIAL_PREBUILT_RULES_TABLE,
  PAGINATION_POPOVER_BTN,
  RELOAD_PREBUILT_RULES_BTN,
  RULE_CHECKBOX,
  RULE_NAME,
  RULE_SWITCH,
  RULE_SWITCH_LOADER,
  RULES_TABLE,
  SORT_RULES_BTN,
  THREE_HUNDRED_ROWS,
  EXPORT_ACTION_BTN,
  EDIT_RULE_ACTION_BTN,
  NEXT_BTN,
  ASYNC_LOADING_PROGRESS,
  RULE_AUTO_REFRESH_IDLE_MODAL,
  RULE_AUTO_REFRESH_IDLE_MODAL_CONTINUE,
} from '../screens/alerts_detection_rules';
import { ALL_ACTIONS, DELETE_RULE } from '../screens/rule_details';

export const activateRule = (rulePosition: number) => {
  cy.get(RULE_SWITCH).eq(rulePosition).click({ force: true });
};

export const changeToThreeHundredRowsPerPage = () => {
  cy.get(PAGINATION_POPOVER_BTN).click({ force: true });
  cy.get(THREE_HUNDRED_ROWS).click();
};

export const editFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).first().click({ force: true });
  cy.get(EDIT_RULE_ACTION_BTN).click();
};

export const deleteFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).first().click({ force: true });
  cy.get(DELETE_RULE_ACTION_BTN).click();
};

export const deleteRule = () => {
  cy.get(ALL_ACTIONS).click();
  cy.get(DELETE_RULE).click();
};

export const deleteSelectedRules = () => {
  cy.get(BULK_ACTIONS_BTN).click({ force: true });
  cy.get(DELETE_RULE_BULK_BTN).click();
};

export const exportFirstRule = () => {
  cy.get(COLLAPSED_ACTION_BTN).first().click({ force: true });
  cy.get(EXPORT_ACTION_BTN).click();
  cy.get(EXPORT_ACTION_BTN).should('not.exist');
};

export const filterByCustomRules = () => {
  cy.get(CUSTOM_RULES_BTN).click({ force: true });
  cy.get(ASYNC_LOADING_PROGRESS).should('exist');
  cy.get(ASYNC_LOADING_PROGRESS).should('not.exist');
};

export const goToCreateNewRule = () => {
  cy.get(CREATE_NEW_RULE_BTN).click({ force: true });
};

export const goToRuleDetails = () => {
  cy.get(RULE_NAME).click({ force: true });
};

export const loadPrebuiltDetectionRules = () => {
  cy.get(LOAD_PREBUILT_RULES_BTN).should('exist').click({ force: true });
};

export const paginate = () => {
  cy.get(NEXT_BTN).click();
};

export const reloadDeletedRules = () => {
  cy.get(RELOAD_PREBUILT_RULES_BTN).click({ force: true });
};

export const selectNumberOfRules = (numberOfRules: number) => {
  for (let i = 0; i < numberOfRules; i++) {
    cy.get(RULE_CHECKBOX).eq(i).click({ force: true });
  }
};

export const sortByActivatedRules = () => {
  cy.get(SORT_RULES_BTN).contains('Activated').click({ force: true });
  waitForRulesToBeLoaded();
  cy.get(SORT_RULES_BTN).contains('Activated').click({ force: true });
  waitForRulesToBeLoaded();
};

export const waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded = () => {
  cy.get(LOADING_INITIAL_PREBUILT_RULES_TABLE).should('exist');
  cy.get(LOADING_INITIAL_PREBUILT_RULES_TABLE).should('not.exist');
};

export const waitForPrebuiltDetectionRulesToBeLoaded = () => {
  cy.get(LOAD_PREBUILT_RULES_BTN).should('not.exist');
  cy.get(RULES_TABLE).should('exist');
};

export const waitForRuleToBeActivated = () => {
  cy.get(RULE_SWITCH_LOADER).should('exist');
  cy.get(RULE_SWITCH_LOADER).should('not.exist');
};

export const waitForRulesToBeLoaded = () => {
  cy.get(ASYNC_LOADING_PROGRESS).should('exist');
  cy.get(ASYNC_LOADING_PROGRESS).should('not.exist');
};

export const checkAutoRefresh = (ms: number, condition: string) => {
  cy.get(ASYNC_LOADING_PROGRESS).should('not.exist');
  cy.tick(ms);
  cy.get(ASYNC_LOADING_PROGRESS).should(condition);
};

export const dismissAllRulesIdleModal = () => {
  cy.get(RULE_AUTO_REFRESH_IDLE_MODAL_CONTINUE)
    .eq(1)
    .should('exist')
    .click({ force: true, multiple: true });
  cy.get(RULE_AUTO_REFRESH_IDLE_MODAL).should('not.exist');
};

export const checkAllRulesIdleModal = (condition: string) => {
  cy.tick(2700000);
  cy.get(RULE_AUTO_REFRESH_IDLE_MODAL).should(condition);
};

export const resetAllRulesIdleModalTimeout = () => {
  cy.tick(2000000);
  cy.window().trigger('mousemove', { force: true });
  cy.tick(700000);
};
