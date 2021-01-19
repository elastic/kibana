/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { exception } from '../objects/exception';
import { newRule } from '../objects/rule';

import { ALERTS_COUNT, NUMBER_OF_ALERTS } from '../screens/alerts';
import { RULE_STATUS } from '../screens/create_new_rule';

import {
  addExceptionFromFirstAlert,
  goToClosedAlerts,
  goToManageAlertsDetectionRules,
  goToOpenedAlerts,
  waitForAlertsIndexToBeCreated,
} from '../tasks/alerts';
import { createCustomRule } from '../tasks/api_calls/rules';
import {
  goToRuleDetails,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRulesToBeLoaded,
} from '../tasks/alerts_detection_rules';
import { waitForAlertsToPopulate } from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  activatesRule,
  addsException,
  addsExceptionFromRuleSettings,
  goBackToAllRulesTable,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../tasks/rule_details';
import { refreshPage } from '../tasks/security_header';

import { DETECTIONS_URL } from '../urls/navigation';
import { cleanKibana } from '../tasks/common';
import {
  deleteExceptionList,
  goToExceptionsTable,
  searchForExceptionList,
  waitForExceptionsTableToBeLoaded,
} from '../tasks/exceptions_table';
import { SHOWING_RULES_TEXT } from '../screens/alerts_detection_rules';
import { EXCEPTIONS_TABLE_SHOWING_LISTS } from '../screens/exceptions';

describe('Exceptions Table', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1';
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsIndexToBeCreated();
    createCustomRule(newRule);
    goToManageAlertsDetectionRules();
    goToRuleDetails();

    cy.get(RULE_STATUS).should('have.text', '—');

    esArchiverLoad('auditbeat_for_exceptions');
    activatesRule();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();
    refreshPage();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS);

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

  context('From exceptions table', () => {
    it('Filters exception lists on search', () => {
      goToExceptionsTable();
      waitForExceptionsTableToBeLoaded();

      cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 2 lists`);

      searchForExceptionList('Endpoint{enter}{enter}');

      cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);

      searchForExceptionList(' {enter}');

      deleteExceptionList();
    });

    it('Deletes exception list', () => {
      goToExceptionsTable();
      waitForExceptionsTableToBeLoaded();

      cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 2 lists`);

      deleteExceptionList();

      cy.get(EXCEPTIONS_TABLE_SHOWING_LISTS).should('have.text', `Showing 1 list`);
    });
  });
});
