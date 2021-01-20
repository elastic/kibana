/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EXCEPTIONS_TABLE_TAB,
  EXCEPTIONS_TABLE,
  EXCEPTIONS_TABLE_SEARCH,
  EXCEPTIONS_TABLE_DELETE_BTN,
  EXCEPTIONS_TABLE_SEARCH_CLEAR,
  EXCEPTIONS_TABLE_MODAL,
  EXCEPTIONS_TABLE_MODAL_CONFIRM_BTN,
} from '../screens/exceptions';

export const goToExceptionsTable = () => {
  cy.get(EXCEPTIONS_TABLE_TAB).should('exist').click({ force: true });
};

export const waitForExceptionsTableToBeLoaded = () => {
  cy.get(EXCEPTIONS_TABLE).should('exist');
};

export const searchForExceptionList = (searchText: string) => {
  cy.get(EXCEPTIONS_TABLE_SEARCH).type(searchText, { force: true }).trigger('search');
};

export const deleteExceptionList = () => {
  cy.get(EXCEPTIONS_TABLE_DELETE_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('exist');
  cy.get(EXCEPTIONS_TABLE_MODAL_CONFIRM_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('not.exist');
};

export const clearSearchSelection = () => {
  cy.get(EXCEPTIONS_TABLE_SEARCH_CLEAR).first().click();
};
