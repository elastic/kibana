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
  EXCEPTIONS_TABLE_EXPORT_MODAL_BTN,
  EXCEPTIONS_OVERFLOW_ACTIONS_BTN,
  EXCEPTIONS_TABLE_EXPORT_CONFIRM_BTN,
  MANAGE_EXCEPTION_CREATE_BUTTON_MENU,
  MANAGE_EXCEPTION_CREATE_LIST_BUTTON,
  CREATE_SHARED_EXCEPTION_LIST_NAME_INPUT,
  CREATE_SHARED_EXCEPTION_LIST_DESCRIPTION_INPUT,
  CREATE_SHARED_EXCEPTION_LIST_BTN,
  EXCEPTIONS_LIST_MANAGEMENT_NAME,
  EXCEPTIONS_LIST_MANAGEMENT_EDIT_NAME_BTN,
  EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_NAME_INPUT,
  EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_DESCRIPTION_INPUT,
  EXCEPTIONS_LIST_EDIT_DETAILS_SAVE_BTN,
  EXCEPTIONS_LIST_DETAILS_HEADER,
} from '../screens/exceptions';

export const clearSearchSelection = () => {
  cy.get(EXCEPTIONS_TABLE_SEARCH_CLEAR).first().click();
};

export const expandExceptionActions = () => {
  cy.get(EXCEPTIONS_OVERFLOW_ACTIONS_BTN).first().click();
};

export const exportExceptionList = () => {
  cy.get(EXCEPTIONS_OVERFLOW_ACTIONS_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_EXPORT_MODAL_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_EXPORT_CONFIRM_BTN).first().click();
};

export const deleteExceptionListWithoutRuleReference = () => {
  cy.get(EXCEPTIONS_OVERFLOW_ACTIONS_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_DELETE_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('exist');
  cy.get(EXCEPTIONS_TABLE_MODAL_CONFIRM_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('not.exist');
};

export const deleteExceptionListWithRuleReference = () => {
  cy.get(EXCEPTIONS_OVERFLOW_ACTIONS_BTN).last().click();
  cy.get(EXCEPTIONS_TABLE_DELETE_BTN).last().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('exist');
  cy.get(EXCEPTIONS_TABLE_MODAL_CONFIRM_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('not.exist');
};

export const searchForExceptionList = (searchText: string) => {
  if (Cypress.browser.name === 'firefox') {
    cy.get(EXCEPTIONS_TABLE_SEARCH).type(`${searchText}{enter}`, { force: true });
  } else {
    cy.get(EXCEPTIONS_TABLE_SEARCH).type(searchText, { force: true }).trigger('search');
  }
};

export const waitForExceptionsTableToBeLoaded = () => {
  cy.get(EXCEPTIONS_TABLE).should('exist');
  cy.get(EXCEPTIONS_TABLE_SEARCH).should('exist');
};

export const createSharedExceptionList = (
  { name, description }: { name: string; description?: string },
  submit: boolean
) => {
  cy.get(MANAGE_EXCEPTION_CREATE_BUTTON_MENU).first().click();
  cy.get(MANAGE_EXCEPTION_CREATE_LIST_BUTTON).first().click();

  cy.get(CREATE_SHARED_EXCEPTION_LIST_NAME_INPUT).type(`${name}`);
  cy.get(CREATE_SHARED_EXCEPTION_LIST_NAME_INPUT).should('have.value', name);

  if (description != null) {
    cy.get(CREATE_SHARED_EXCEPTION_LIST_DESCRIPTION_INPUT).should('not.have.value');
    cy.get(CREATE_SHARED_EXCEPTION_LIST_DESCRIPTION_INPUT).type(`${description}`);
    cy.get(CREATE_SHARED_EXCEPTION_LIST_DESCRIPTION_INPUT).should('have.value', description);
  }

  if (submit) {
    cy.get(CREATE_SHARED_EXCEPTION_LIST_BTN).first().click();
  }
};

export const waitForExceptionListDetailToBeLoaded = () => {
  cy.get(EXCEPTIONS_LIST_DETAILS_HEADER).should('exist');
};

export const editExceptionLisDetails = ({
  name,
  description,
}: {
  name?: { original: string; updated: string };
  description?: { original: string; updated: string | null };
}) => {
  cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('exist');
  cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_NAME_BTN).first().click();

  if (name != null) {
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', name.original);
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_NAME_INPUT)
      .should('have.value', name.original)
      .clear({ force: true })
      .type(`${name.updated}`);
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_NAME_INPUT).should('have.value', name.updated);
  }

  if (description != null) {
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_DESCRIPTION_INPUT)
      .should('have.value', description.original)
      .clear({ force: true })
      .should('not.have.value');
    if (description.updated != null) {
      cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_DESCRIPTION_INPUT).type(
        `${description.updated}`
      );
      cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_DESCRIPTION_INPUT).should(
        'have.value',
        description.updated
      );
    }
  }

  cy.get(EXCEPTIONS_LIST_EDIT_DETAILS_SAVE_BTN).first().click();
};
