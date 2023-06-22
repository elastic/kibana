/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';

import { createRule } from '../../../tasks/api_calls/rules';
import { login, visitWithoutDateRange } from '../../../tasks/login';

import { EXCEPTIONS_URL } from '../../../urls/navigation';
import {
  searchForExceptionList,
  waitForExceptionsTableToBeLoaded,
  clearSearchSelection,
} from '../../../tasks/exceptions_table';
import {
  EXCEPTIONS_TABLE_LIST_NAME,
  EXCEPTIONS_TABLE_SHOWING_LISTS,
} from '../../../screens/exceptions';
import { createExceptionList } from '../../../tasks/api_calls/exceptions';
import { esArchiverResetKibana } from '../../../tasks/es_archiver';

const getExceptionList1 = () => ({
  ...getExceptionList(),
  name: 'Test a new list 1',
  list_id: 'exception_list_1',
});
const getExceptionList2 = () => ({
  ...getExceptionList(),
  name: 'Test list 2',
  list_id: 'exception_list_2',
});

describe('Exceptions Table', () => {
  before(() => {
    esArchiverResetKibana();
    login();

    // Create exception list associated with a rule
    createExceptionList(getExceptionList2(), getExceptionList2().list_id).then((response) =>
      createRule({
        ...getNewRule(),
        exceptions_list: [
          {
            id: response.body.id,
            list_id: getExceptionList2().list_id,
            type: getExceptionList2().type,
            namespace_type: getExceptionList2().namespace_type,
          },
        ],
      })
    );

    // Create exception list not used by any rules
    createExceptionList(getExceptionList1(), getExceptionList1().list_id).as(
      'exceptionListResponse'
    );
  });

  beforeEach(() => {
    visitWithoutDateRange(EXCEPTIONS_URL);
  });

  it('Filters exception lists on search', () => {
    waitForExceptionsTableToBeLoaded();

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '3');

    // Single word search
    searchForExceptionList('Endpoint');

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).should('have.text', 'Endpoint Security Exception List');

    // Multi word search
    clearSearchSelection();
    searchForExceptionList('test');

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '2');
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).eq(1).should('have.text', 'Test list 2');
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).eq(0).should('have.text', 'Test a new list 1');

    // Exact phrase search
    clearSearchSelection();
    searchForExceptionList(`"${getExceptionList1().name}"`);

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).should('have.text', getExceptionList1().name);

    // Field search
    clearSearchSelection();
    searchForExceptionList('list_id:endpoint_list');

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).should('have.text', 'Endpoint Security Exception List');

    clearSearchSelection();

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '3');
  });
});
