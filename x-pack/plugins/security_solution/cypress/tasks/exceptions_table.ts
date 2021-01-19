/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EXCEPTIONS_TABLE_TAB,
  EXCEPTIONS_TABLE,
  EXCEPTIONS_TABLE_SEARCH,
  EXCEPTIONS_TABLE_NAME_COLUMN,
  EXCEPTIONS_TABLE_DELETE_BTN,
} from '../screens/exceptions';

export const goToExceptionsTable = () => {
  cy.get(EXCEPTIONS_TABLE_TAB).should('exist').click({ force: true });
};

export const waitForExceptionsTableToBeLoaded = () => {
  cy.get(EXCEPTIONS_TABLE).should('exist');
  cy.get(EXCEPTIONS_TABLE_SEARCH).should('not.be.disabled');
};

export const searchForExceptionList = (searchText: string) => {
  cy.get(EXCEPTIONS_TABLE_SEARCH).type(searchText, { force: true });
};

export const deleteExceptionList = () => {
  cy.get(EXCEPTIONS_TABLE_DELETE_BTN).first().click();
};
