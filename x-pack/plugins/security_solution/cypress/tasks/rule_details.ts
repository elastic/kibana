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
  CLOSE_ALERTS_CHECKBOX,
  CONFIRM_BTN,
  EXCEPTION_ITEM_VIEWER_SEARCH,
  FIELD_INPUT,
  LOADING_SPINNER,
  OPERATOR_INPUT,
  VALUES_INPUT,
} from '../screens/exceptions';
import {
  ALERTS_TAB,
  BACK_TO_RULES,
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
  EDIT_RULE_SETTINGS_LINK,
} from '../screens/rule_details';
import { addsFields, closeFieldsBrowser, filterFieldsBrowser } from './fields_browser';

export const enablesRule = () => {
  // Rules get enabled via _bulk_action endpoint
  cy.intercept('POST', '/api/detection_engine/rules/_bulk_action').as('bulk_action');
  cy.get(RULE_SWITCH).should('be.visible');
  cy.get(RULE_SWITCH).click();
  cy.wait('@bulk_action').then(({ response }) => {
    cy.wrap(response?.statusCode).should('eql', 200);
  });
};

export const addsException = (exception: Exception) => {
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
  cy.get(FIELD_INPUT).should('exist');
  cy.get(FIELD_INPUT).type(`${exception.field}{enter}`);
  cy.get(OPERATOR_INPUT).type(`${exception.operator}{enter}`);
  exception.values.forEach((value) => {
    cy.get(VALUES_INPUT).type(`${value}{enter}`);
  });
  cy.get(CLOSE_ALERTS_CHECKBOX).click({ force: true });
  cy.get(CONFIRM_BTN).click();
  cy.get(CONFIRM_BTN).should('have.attr', 'disabled');
  cy.get(CONFIRM_BTN).should('not.exist');
};

export const addsFieldsToTimeline = (search: string, fields: string[]) => {
  cy.get(FIELDS_BROWSER_BTN).click();
  filterFieldsBrowser(search);
  addsFields(fields);
  closeFieldsBrowser();
};

export const openExceptionFlyoutFromEmptyViewerPrompt = () => {
  cy.root()
    .pipe(($el) => {
      $el.find(ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN).trigger('click');
      return $el.find(FIELD_INPUT);
    })
    .should('be.visible');
};

export const searchForExceptionItem = (query: string) => {
  cy.get(EXCEPTION_ITEM_VIEWER_SEARCH).type(`${query}`).trigger('keydown', {
    key: 'Enter',
    keyCode: 13,
    code: 'Enter',
    type: 'keydown',
  });
};

const addExceptionFlyoutFromViewerHeader = () => {
  cy.root()
    .pipe(($el) => {
      $el.find(ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER).trigger('click');
      return $el.find(FIELD_INPUT);
    })
    .should('be.visible');
};

export const addExceptionFromRuleDetails = (exception: Exception) => {
  addExceptionFlyoutFromViewerHeader();
  cy.get(FIELD_INPUT).type(`${exception.field}{downArrow}{enter}`);
  cy.get(OPERATOR_INPUT).type(`${exception.operator}{enter}`);
  exception.values.forEach((value) => {
    cy.get(VALUES_INPUT).type(`${value}{enter}`);
  });
  cy.get(CLOSE_ALERTS_CHECKBOX).click({ force: true });
  cy.get(CONFIRM_BTN).click();
  cy.get(CONFIRM_BTN).should('have.attr', 'disabled');
  cy.get(CONFIRM_BTN).should('not.exist');
};

export const addFirstExceptionFromRuleDetails = (exception: Exception) => {
  openExceptionFlyoutFromEmptyViewerPrompt();
  cy.get(FIELD_INPUT).type(`${exception.field}{downArrow}{enter}`);
  cy.get(OPERATOR_INPUT).type(`${exception.operator}{enter}`);
  exception.values.forEach((value) => {
    cy.get(VALUES_INPUT).type(`${value}{enter}`);
  });
  cy.get(CLOSE_ALERTS_CHECKBOX).click({ force: true });
  cy.get(CONFIRM_BTN).click();
  cy.get(CONFIRM_BTN).should('have.attr', 'disabled');
  cy.get(CONFIRM_BTN).should('not.exist');
};

export const goToAlertsTab = () => {
  cy.get(ALERTS_TAB).click();
};

export const goToExceptionsTab = () => {
  cy.get(EXCEPTIONS_TAB).should('exist');
  cy.get(EXCEPTIONS_TAB).click();
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
    cy.get(REFRESH_BUTTON).click({ force: true });
    return cy
      .get(RULE_STATUS)
      .invoke('text')
      .then((ruleStatus) => ruleStatus === 'succeeded');
  });
};

export const goBackToAllRulesTable = () => {
  cy.get(BACK_TO_RULES).click();
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
