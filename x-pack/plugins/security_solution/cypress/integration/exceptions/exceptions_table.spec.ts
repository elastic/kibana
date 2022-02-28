/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getExceptionList,
  getEndpointExceptionList,
  expectedExportedExceptionList,
} from '../../objects/exception';
import { getNewRule } from '../../objects/rule';
import { createCustomRuleWithExceptions } from '../../tasks/api_calls/rules';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { EXCEPTIONS_URL } from '../../urls/navigation';
import { cleanKibana } from '../../tasks/common';
import {
  deleteExceptionListWithRuleReference,
  deleteExceptionListWithoutRuleReference,
  exportExceptionList,
  searchForExceptionList,
  waitForExceptionsTableToBeLoaded,
  clearSearchSelection,
} from '../../tasks/exceptions_table';
import {
  EXCEPTIONS_TABLE_LIST_NAME,
  EXCEPTIONS_TABLE_SHOWING_LISTS,
} from '../../screens/exceptions';
import {
  createExceptionList,
  createExceptionLists,
  deleteAllExceptions,
} from '../../tasks/api_calls/exceptions';

const getExceptionList1 = () => ({
  ...getExceptionList(),
  name: 'Test list 1',
  list_id: 'exception_list_1',
});
const getExceptionList2 = () => ({
  ...getExceptionList(),
  name: 'New Rule Test',
  list_id: 'exception_list_2',
});

describe('Exceptions Table', () => {
  beforeEach(() => {
    cleanKibana();
    // delete all exception lists
    deleteAllExceptions();
  });

  it('Exports exception list', function () {
    cy.intercept(/(\/api\/exception_lists\/_export)/).as('export');

    loginAndWaitForPageWithoutDateRange(EXCEPTIONS_URL);

    createExceptionList(getExceptionList1(), getExceptionList1().list_id).as(
      'exceptionListResponse1'
    );

    waitForExceptionsTableToBeLoaded();

    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, 'Showing 1 list');

    exportExceptionList();

    cy.wait('@export').then(({ response }) =>
      cy
        .wrap(response?.body)
        .should('eql', expectedExportedExceptionList(this.exceptionListResponse1))
    );
  });

  it('Filters exception lists on search', () => {
    createExceptionLists([
      [getExceptionList1(), getExceptionList1().list_id],
      [getExceptionList2(), getExceptionList2().list_id],
      [getEndpointExceptionList(), getEndpointExceptionList().list_id],
    ]);

    loginAndWaitForPageWithoutDateRange(EXCEPTIONS_URL);
    waitForExceptionsTableToBeLoaded();

    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, `Showing 3 lists`);

    // Single word search
    searchForExceptionList('Endpoint');

    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, `Showing 1 list`);
    cy.contains(EXCEPTIONS_TABLE_LIST_NAME, getEndpointExceptionList().name);

    // Multi word search
    clearSearchSelection();
    searchForExceptionList('New Rule Test');

    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, `Showing 2 lists`);
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).eq(0).should('have.text', getExceptionList2().name);
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).eq(1).should('have.text', getExceptionList1().name);

    // Exact phrase search
    clearSearchSelection();
    searchForExceptionList('"New Rule Test"');

    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, `Showing 1 list`);
    cy.contains(EXCEPTIONS_TABLE_LIST_NAME, getExceptionList2().name);

    // Field search
    clearSearchSelection();
    searchForExceptionList('list_id:endpoint_exception_list');

    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, `Showing 1 list`);
    cy.contains(EXCEPTIONS_TABLE_LIST_NAME, getEndpointExceptionList().name);

    clearSearchSelection();

    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, `Showing 3 lists`);
  });

  it('Deletes exception list without rule reference', () => {
    createExceptionList(getExceptionList1(), getExceptionList1().list_id).then(() => {
      loginAndWaitForPageWithoutDateRange(EXCEPTIONS_URL);
      waitForExceptionsTableToBeLoaded();

      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, `Showing 1 list`);

      deleteExceptionListWithoutRuleReference();

      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, `Showing 0 lists`);
    });
  });

  it('Deletes exception list with rule reference', () => {
    createExceptionList(getExceptionList2(), getExceptionList2().list_id)
      .then((response) =>
        createCustomRuleWithExceptions({
          ...getNewRule(),
          exceptionList: [
            {
              id: response.body.id,
              list_id: getExceptionList2().list_id,
              type: getExceptionList2().type,
              namespace_type: getExceptionList2().namespace_type,
            },
          ],
        })
      )
      .then(() => {
        loginAndWaitForPageWithoutDateRange(EXCEPTIONS_URL);
        waitForExceptionsTableToBeLoaded();

        // We only created 1, but the call to create a rule
        // triggers the creation of the Endpoint Security Team
        // in the background, so 2 lists will show
        cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, `Showing 2 lists`);

        deleteExceptionListWithRuleReference();

        cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, `Showing 1 list`);
      });
  });
});
