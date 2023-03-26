/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '../../../../common/test';
import { getExceptionList, expectedExportedExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';

import { createRule } from '../../../tasks/api_calls/rules';
import { login, visitWithoutDateRange, waitForPageWithoutDateRange } from '../../../tasks/login';

import { EXCEPTIONS_URL } from '../../../urls/navigation';
import {
  deleteExceptionListWithRuleReference,
  deleteExceptionListWithoutRuleReference,
  exportExceptionList,
  waitForExceptionsTableToBeLoaded,
  createSharedExceptionList,
} from '../../../tasks/exceptions_table';
import {
  EXCEPTIONS_LIST_MANAGEMENT_NAME,
  EXCEPTIONS_OVERFLOW_ACTIONS_BTN,
  EXCEPTIONS_TABLE_SHOWING_LISTS,
} from '../../../screens/exceptions';
import { createExceptionList } from '../../../tasks/api_calls/exceptions';
import { esArchiverResetKibana } from '../../../tasks/es_archiver';
import { TOASTER } from '../../../screens/alerts_detection_rules';

const EXCEPTION_LIST_NAME = 'My shared list';
const getExceptionList1 = () => ({
  ...getExceptionList(),
  name: EXCEPTION_LIST_NAME,
  list_id: 'exception_list_1',
});
const getExceptionList2 = () => ({
  ...getExceptionList(),
  name: 'Test list 2',
  list_id: 'exception_list_2',
});

describe('Manage shared exception list', () => {
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
    waitForExceptionsTableToBeLoaded();
  });

  it('Export exception list', function () {
    cy.intercept(/(\/api\/exception_lists\/_export)/).as('export');

    exportExceptionList();

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response?.body).should(
        'eql',
        expectedExportedExceptionList(this.exceptionListResponse)
      );

      cy.get(TOASTER).should(
        'have.text',
        `Exception list "${EXCEPTION_LIST_NAME}" exported successfully`
      );
    });
  });

  it('Create exception list', function () {
    createSharedExceptionList({ name: EXCEPTION_LIST_NAME, description: 'This is my list.' }, true);

    // After creation - directed to list detail page
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', EXCEPTION_LIST_NAME);
  });

  it('Delete exception list without rule reference', () => {
    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '4');

    deleteExceptionListWithoutRuleReference();

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '3');
  });

  it('Deletes exception list with rule reference', () => {
    waitForPageWithoutDateRange(EXCEPTIONS_URL);
    waitForExceptionsTableToBeLoaded();

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '3');

    deleteExceptionListWithRuleReference();

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '2');
  });
});

describe('Manage shared exception list - read only', () => {
  before(() => {
    // First we login as a privileged user to create exception list
    esArchiverResetKibana();
    login(ROLES.platform_engineer);
    visitWithoutDateRange(EXCEPTIONS_URL, ROLES.platform_engineer);
    createExceptionList(getExceptionList(), getExceptionList().list_id);

    // Then we login as read-only user to test.
    login(ROLES.reader);
    visitWithoutDateRange(EXCEPTIONS_URL, ROLES.reader);
    waitForExceptionsTableToBeLoaded();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);
  });

  it('Exception list actions should be disabled', () => {
    cy.get(EXCEPTIONS_OVERFLOW_ACTIONS_BTN).first().should('be.disabled');
  });
});
