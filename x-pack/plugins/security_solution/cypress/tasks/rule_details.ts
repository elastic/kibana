/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Exception } from '../objects/exception';
import { RULE_STATUS } from '../screens/create_new_rule';
import {
  ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN,
  ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER,
  EXCEPTION_ITEM_VIEWER_SEARCH,
  FIELD_INPUT,
} from '../screens/exceptions';
import {
  ALERTS_TAB,
  EXCEPTIONS_TAB,
  FIELDS_BROWSER_BTN,
  REFRESH_BUTTON,
  REMOVE_EXCEPTION_BTN,
  RULE_SWITCH,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  DETAILS_TITLE,
  DETAILS_DESCRIPTION,
  EXCEPTION_ITEM_ACTIONS_BUTTON,
  EDIT_EXCEPTION_BTN,
  ENDPOINT_EXCEPTIONS_TAB,
  EDIT_RULE_SETTINGS_LINK,
  BACK_TO_RULES_TABLE,
  EXCEPTIONS_TAB_EXPIRED_FILTER,
  EXCEPTIONS_TAB_ACTIVE_FILTER,
} from '../screens/rule_details';
import {
  addExceptionConditions,
  addExceptionFlyoutItemName,
  selectBulkCloseAlerts,
  submitNewExceptionItem,
} from './exceptions';
import { addsFields, closeFieldsBrowser, filterFieldsBrowser } from './fields_browser';

export const enablesRule = () => {
  // Rules get enabled via _bulk_action endpoint
  cy.intercept('POST', '/api/detection_engine/rules/_bulk_action?dry_run=false').as('bulk_action');
  cy.get(RULE_SWITCH).should('be.visible');
  cy.get(RULE_SWITCH).click();
  cy.wait('@bulk_action').then(({ response }) => {
    cy.wrap(response?.statusCode).should('eql', 200);
  });
};

export const addsFieldsToTimeline = (search: string, fields: string[]) => {
  cy.get(FIELDS_BROWSER_BTN).click();
  filterFieldsBrowser(search);
  addsFields(fields);
  closeFieldsBrowser();
};

export const openExceptionFlyoutFromEmptyViewerPrompt = () => {
  cy.get(ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN).click();
  cy.get(FIELD_INPUT).should('be.visible');
};

export const searchForExceptionItem = (query: string) => {
  cy.get(EXCEPTION_ITEM_VIEWER_SEARCH).clear();
  cy.get(EXCEPTION_ITEM_VIEWER_SEARCH).type(`${query}{enter}`);
};

export const addExceptionFlyoutFromViewerHeader = () => {
  cy.get(ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER).click();
  cy.get(FIELD_INPUT).should('be.visible');
};

export const addExceptionFromRuleDetails = (exception: Exception) => {
  addExceptionFlyoutFromViewerHeader();
  addExceptionConditions(exception);
  submitNewExceptionItem();
};

export const addFirstExceptionFromRuleDetails = (exception: Exception, name: string) => {
  openExceptionFlyoutFromEmptyViewerPrompt();
  addExceptionFlyoutItemName(name);
  addExceptionConditions(exception);
  selectBulkCloseAlerts();
  submitNewExceptionItem();
};

export const goToAlertsTab = () => {
  cy.get(ALERTS_TAB).click();
};

export const goToExceptionsTab = () => {
  cy.get(EXCEPTIONS_TAB).click();
};

export const viewExpiredExceptionItems = () => {
  cy.get(EXCEPTIONS_TAB_EXPIRED_FILTER).click();
  cy.get(EXCEPTIONS_TAB_ACTIVE_FILTER).click();
};

export const goToEndpointExceptionsTab = () => {
  cy.get(ENDPOINT_EXCEPTIONS_TAB).click();
};

export const openEditException = (index = 0) => {
  cy.get(EXCEPTION_ITEM_ACTIONS_BUTTON).eq(index).click({ force: true });
  cy.get(EDIT_EXCEPTION_BTN).eq(index).click({ force: true });
};

export const removeException = () => {
  cy.get(EXCEPTION_ITEM_ACTIONS_BUTTON).click();

  cy.get(REMOVE_EXCEPTION_BTN).click();
};

export const waitForTheRuleToBeExecuted = () => {
  cy.waitUntil(() => {
    cy.log('Wating for the rule to be executed');
    cy.get(REFRESH_BUTTON).click({ force: true });
    return cy
      .get(RULE_STATUS)
      .invoke('text')
      .then((ruleStatus) => ruleStatus === 'succeeded');
  });
};

export const goBackToRulesTable = () => {
  cy.get(BACK_TO_RULES_TABLE).click();
};

export const getDetails = (title: string | RegExp) =>
  cy.contains(DETAILS_TITLE, title).next(DETAILS_DESCRIPTION);

export const assertDetailsNotExist = (title: string | RegExp) =>
  cy.get(DETAILS_TITLE).contains(title).should('not.exist');

export const hasIndexPatterns = (indexPatterns: string) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(INDEX_PATTERNS_DETAILS).should('have.text', indexPatterns);
  });
};

export const goToRuleEditSettings = () => {
  cy.get(EDIT_RULE_SETTINGS_LINK).click();
};
