/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { exception } from '../objects/exception';
import { newRule } from '../objects/rule';

import { RULE_STATUS } from '../screens/create_new_rule';

import { goToManageAlertsDetectionRules, waitForAlertsIndexToBeCreated } from '../tasks/alerts';
import { createCustomRule } from '../tasks/api_calls/rules';
import { goToRuleDetails, waitForRulesToBeLoaded } from '../tasks/alerts_detection_rules';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  addsExceptionFromRuleSettings,
  goBackToAllRulesTable,
  goToExceptionsTab,
  waitForTheRuleToBeExecuted,
} from '../tasks/rule_details';

import { DETECTIONS_URL } from '../urls/navigation';
import { cleanKibana } from '../tasks/common';
import {
  deleteExceptionList,
  goToExceptionsTable,
  searchForExceptionList,
  waitForExceptionsTableToBeLoaded,
  clearSearchSelection,
} from '../tasks/exceptions_table';
import { EXCEPTIONS_TABLE_LIST_NAME, EXCEPTIONS_TABLE_SHOWING_LISTS } from '../screens/exceptions';

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
    esArchiverLoad('auditbeat_for_exceptions2');
    waitForTheRuleToBeExecuted();

    goBackToAllRulesTable();
    waitForRulesToBeLoaded();
  });

  afterEach(() => {
    esArchiverUnload('auditbeat_for_exceptions');
    esArchiverUnload('auditbeat_for_exceptions2');
  });

  it('Filters exception lists on search', () => {
    goToExceptionsTable();
    waitForExceptionsTableToBeLoaded();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 2 lists`);

    // Single word search
    searchForExceptionList('Endpoint');

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).should('have.text', 'Endpoint Security Exception List');

    // Multi word search
    clearSearchSelection();
    searchForExceptionList('New Rule Test');

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).should('have.text', 'New Rule Test');

    // Field search
    clearSearchSelection();
    searchForExceptionList('list_id:endpoint_list');

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);
    cy.get(EXCEPTIONS_TABLE_LIST_NAME).should('have.text', 'Endpoint Security Exception List');

    clearSearchSelection();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 2 lists`);
  });

  it('Deletes exception list', () => {
    goToExceptionsTable();
    waitForExceptionsTableToBeLoaded();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 2 lists`);

    deleteExceptionList();

    cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);
  });
});
