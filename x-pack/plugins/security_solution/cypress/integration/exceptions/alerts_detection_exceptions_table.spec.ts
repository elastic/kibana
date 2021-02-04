/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exception, exceptionList, expectedExportedExceptionList } from '../../objects/exception';
import { newRule } from '../../objects/rule';

import { RULE_STATUS } from '../../screens/create_new_rule';

import { goToManageAlertsDetectionRules, waitForAlertsIndexToBeCreated } from '../../tasks/alerts';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { goToRuleDetails, waitForRulesToBeLoaded } from '../../tasks/alerts_detection_rules';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import {
  addsExceptionFromRuleSettings,
  goBackToAllRulesTable,
  goToExceptionsTab,
  waitForTheRuleToBeExecuted,
} from '../../tasks/rule_details';

import { DETECTIONS_URL } from '../../urls/navigation';
import { cleanKibana } from '../../tasks/common';
import {
  deleteExceptionListWithRuleReference,
  deleteExceptionListWithoutRuleReference,
  exportExceptionList,
  goToExceptionsTable,
  searchForExceptionList,
  waitForExceptionsTableToBeLoaded,
  clearSearchSelection,
} from '../../tasks/exceptions_table';
import {
  EXCEPTIONS_TABLE_LIST_NAME,
  EXCEPTIONS_TABLE_SHOWING_LISTS,
} from '../../screens/exceptions';
import { createExceptionList } from '../../tasks/api_calls/exceptions';

describe('Exceptions Table', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsIndexToBeCreated();
    createCustomRule(newRule);
    goToManageAlertsDetectionRules();
    goToRuleDetails();

    cy.get(RULE_STATUS).should('have.text', '—');

    esArchiverLoad('auditbeat_for_exceptions');

    // Add a detections exception list
    goToExceptionsTab();
    addsExceptionFromRuleSettings(exception);
    waitForTheRuleToBeExecuted();

    // Create exception list not used by any rules
    createExceptionList(exceptionList).as('exceptionListResponse');

    goBackToAllRulesTable();
    waitForRulesToBeLoaded();
  });

  after(() => {
    esArchiverUnload('auditbeat_for_exceptions');
  });

  it('Filters exception lists on search', () => {
    goToExceptionsTable();
    waitForExceptionsTableToBeLoaded();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 3 lists`);

    // Single word search
    searchForExceptionList('Endpoint');

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).should('have.text', 'Endpoint Security Exception List');

    // Multi word search
    clearSearchSelection();
    searchForExceptionList('New Rule Test');

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 2 lists`);
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).eq(0).should('have.text', 'Test exception list');
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).eq(1).should('have.text', 'New Rule Test');

    // Exact phrase search
    clearSearchSelection();
    searchForExceptionList('"New Rule Test"');

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).should('have.text', 'New Rule Test');

    // Field search
    clearSearchSelection();
    searchForExceptionList('list_id:endpoint_list');

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).should('have.text', 'Endpoint Security Exception List');

    clearSearchSelection();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 3 lists`);
  });

  it('Exports exception list', async function () {
    cy.intercept(/(\/api\/exception_lists\/_export)/).as('export');

    goToExceptionsTable();
    waitForExceptionsTableToBeLoaded();

    exportExceptionList();

    cy.wait('@export').then(({ response }) => {
      cy.wrap(response!.body).should(
        'eql',
        expectedExportedExceptionList(this.exceptionListResponse)
      );
    });
  });

  it('Deletes exception list without rule reference', () => {
    goToExceptionsTable();
    waitForExceptionsTableToBeLoaded();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 3 lists`);

    deleteExceptionListWithoutRuleReference();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 2 lists`);
  });

  it('Deletes exception list with rule reference', () => {
    goToExceptionsTable();
    waitForExceptionsTableToBeLoaded();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 2 lists`);

    deleteExceptionListWithRuleReference();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);
  });
});
