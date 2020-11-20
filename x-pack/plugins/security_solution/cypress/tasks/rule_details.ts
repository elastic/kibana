/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  EXCEPTIONS_TAB,
  REFRESH_BUTTON,
  REMOVE_EXCEPTION_BTN,
  RULE_SWITCH,
} from '../screens/rule_details';

export const activatesRule = () => {
  cy.get(RULE_SWITCH).should('be.visible');
  cy.get(RULE_SWITCH).click();
};

export const deactivatesRule = () => {
  cy.get(RULE_SWITCH).should('be.visible');
  cy.get(RULE_SWITCH).click();
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
  cy.get(CONFIRM_BTN).should('not.have.attr', 'disabled');
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
  cy.get(CONFIRM_BTN).should('not.have.attr', 'disabled');
};

export const goToAlertsTab = () => {
  cy.get(ALERTS_TAB).click();
};

export const goToExceptionsTab = () => {
  cy.get(EXCEPTIONS_TAB).click();
};

export const removeException = () => {
  cy.get(REMOVE_EXCEPTION_BTN).click();
};

export const waitForTheRuleToBeExecuted = async () => {
  let status = '';
  while (status !== 'succeeded') {
    cy.get(REFRESH_BUTTON).click({ force: true });
    status = await cy.get(RULE_STATUS).invoke('text').promisify();
  }
};
