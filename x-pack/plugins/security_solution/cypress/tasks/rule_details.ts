/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Exception } from '../objects/exception';
import { RULE_STATUS } from '../screens/create_new_rule';
import {
  ADD_EXCEPTIONS_BTN,
  CLOSE_ALERTS_CHECKBOX,
  CONFIRM_BTN,
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
} from '../screens/rule_details';
import { addsFields, closeFieldsBrowser, filterFieldsBrowser } from './fields_browser';

export const enablesRule = () => {
  cy.intercept('PATCH', '/api/detection_engine/rules/_bulk_update').as('bulk_update');
  cy.get(RULE_SWITCH).should('be.visible');
  cy.get(RULE_SWITCH).click();
  cy.wait('@bulk_update').then(({ response }) => {
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

export const openExceptionFlyoutFromRuleSettings = () => {
  cy.get(ADD_EXCEPTIONS_BTN).click();
  cy.get(LOADING_SPINNER).should('not.exist');
  cy.get(FIELD_INPUT).should('be.visible');
};

export const addsExceptionFromRuleSettings = (exception: Exception) => {
  cy.get(ADD_EXCEPTIONS_BTN).click();
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
  cy.get(FIELD_INPUT).should('be.visible');
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

export const goToAlertsTab = () => {
  cy.get(ALERTS_TAB).click();
};

export const goToExceptionsTab = () => {
  cy.root()
    .pipe(($el) => {
      $el.find(EXCEPTIONS_TAB).trigger('click');
      return $el.find(ADD_EXCEPTIONS_BTN);
    })
    .should('be.visible');
};

export const removeException = () => {
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

export const getDetails = (title: string) =>
  cy.get(DETAILS_TITLE).contains(title).next(DETAILS_DESCRIPTION);

export const hasIndexPatterns = (indexPatterns: string) => {
  cy.get(DEFINITION_DETAILS).within(() => {
    getDetails(INDEX_PATTERNS_DETAILS).should('have.text', indexPatterns);
  });
};
