/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXCEPTIONS_TABLE,
  EXCEPTIONS_TABLE_SEARCH,
  EXCEPTIONS_TABLE_DELETE_BTN,
  EXCEPTIONS_TABLE_SEARCH_CLEAR,
  EXCEPTIONS_TABLE_MODAL,
  EXCEPTIONS_TABLE_MODAL_CONFIRM_BTN,
  EXCEPTIONS_TABLE_EXPORT_BTN,
} from '../screens/exceptions';

export const waitForExceptionsTableToBeLoaded = () => {
  cy.get(EXCEPTIONS_TABLE).should('exist');
  cy.get(EXCEPTIONS_TABLE_SEARCH).should('exist');
};

export const searchForExceptionList = (searchText: string) => {
  if (Cypress.browser.name === 'firefox') {
    cy.get(EXCEPTIONS_TABLE_SEARCH).type(`${searchText}{enter}`, { force: true });
  } else {
    cy.get(EXCEPTIONS_TABLE_SEARCH).type(searchText, { force: true }).trigger('search');
  }
};

export const deleteExceptionListWithoutRuleReference = () => {
  cy.get(EXCEPTIONS_TABLE_DELETE_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('not.exist');
};

export const deleteExceptionListWithRuleReference = () => {
  cy.get(EXCEPTIONS_TABLE_DELETE_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('exist');
  cy.get(EXCEPTIONS_TABLE_MODAL_CONFIRM_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('not.exist');
};

export const exportExceptionList = () => {
  cy.get(EXCEPTIONS_TABLE_EXPORT_BTN).first().click();
};

export const clearSearchSelection = () => {
  cy.get(EXCEPTIONS_TABLE_SEARCH_CLEAR).first().click();
};
