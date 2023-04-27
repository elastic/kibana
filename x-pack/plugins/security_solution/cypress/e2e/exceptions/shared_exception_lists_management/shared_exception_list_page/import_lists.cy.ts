/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOASTER, TOASTER_BODY } from '../../../../screens/alerts_detection_rules';
import {
  IMPORT_SHARED_EXCEPTION_LISTS_CLOSE_BTN,
  EXCEPTIONS_TABLE_SHOWING_LISTS,
  IMPORT_SHARED_EXCEPTION_LISTS_OVERWRITE_EXISTING_CHECKBOX,
  IMPORT_SHARED_EXCEPTION_LISTS_CONFIRM_BTN,
  IMPORT_SHARED_EXCEPTION_LISTS_OVERWRITE_CREATE_NEW_CHECKBOX,
} from '../../../../screens/exceptions';
import { closeErrorToast } from '../../../../tasks/alerts_detection_rules';
import {
  waitForExceptionsTableToBeLoaded,
  importExceptionLists,
} from '../../../../tasks/exceptions_table';
import { visitWithoutDateRange } from '../../../../tasks/login';
import { EXCEPTIONS_URL } from '../../../../urls/navigation';
import { esArchiverResetKibana } from '../../../../tasks/es_archiver';

describe('Import Lists', () => {
  const LIST_TO_IMPORT_FILENAME = 'cypress/fixtures/7_16_exception_list.ndjson';
  before(() => {
    esArchiverResetKibana();
  });
  beforeEach(() => {
    visitWithoutDateRange(EXCEPTIONS_URL);
    waitForExceptionsTableToBeLoaded();
  });
  it('Should import exception list successfully if the list does not exist', () => {
    cy.intercept(/(\/api\/exception_lists\/_import)/).as('import');
    importExceptionLists(LIST_TO_IMPORT_FILENAME);

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should('have.text', `Exception list imported`);
    });
    cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CLOSE_BTN).click();

    // Validate table items count
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
  });

  it('Should not import exception list if it exists', () => {
    cy.intercept(/(\/api\/exception_lists\/_import)/).as('import');
    importExceptionLists(LIST_TO_IMPORT_FILENAME);

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should('have.text', 'There was an error uploading the exception list.');
      cy.get(TOASTER_BODY).should('contain', 'Found that list_id');
    });
    // Validate table items count
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
  });

  it('Should import exception list if it exists but the user selected overwrite checkbox', () => {
    cy.intercept(/(\/api\/exception_lists\/_import)/).as('import');
    importExceptionLists(LIST_TO_IMPORT_FILENAME);

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should('have.text', 'There was an error uploading the exception list.');
      cy.get(TOASTER_BODY).should('contain', 'Found that list_id');
    });
    // Validate table items count
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');

    // { force: true }: The EuiCheckbox component's label covers the checkbox
    cy.get(IMPORT_SHARED_EXCEPTION_LISTS_OVERWRITE_EXISTING_CHECKBOX).check({ force: true });

    // Close the Error toast to be able to import again
    closeErrorToast();

    cy.intercept(/(\/api\/exception_lists\/_import)/).as('import');

    // Import after selecting overwrite option
    cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CONFIRM_BTN).click();

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should('have.text', `Exception list imported`);
    });

    // Validate table items count
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
  });

  it('Should import exception list if it exists but the user selected create new checkbox', () => {
    cy.intercept(/(\/api\/exception_lists\/_import)/).as('import');
    importExceptionLists(LIST_TO_IMPORT_FILENAME);

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should('have.text', 'There was an error uploading the exception list.');
      cy.get(TOASTER_BODY).should('contain', 'Found that list_id');
    });
    // Validate table items count
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');

    // { force: true }: The EuiCheckbox component's label covers the checkbox
    cy.get(IMPORT_SHARED_EXCEPTION_LISTS_OVERWRITE_CREATE_NEW_CHECKBOX).check({ force: true });

    // Close the Error toast to be able to import again
    closeErrorToast();

    cy.intercept(/(\/api\/exception_lists\/_import)/).as('import');

    // Import after selecting overwrite option
    cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CONFIRM_BTN).click();

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should('have.text', `Exception list imported`);
    });
    // Validate table items count
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '2');
  });
});
