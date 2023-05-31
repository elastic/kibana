/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOADING_INDICATOR } from '../../../screens/security_header';
import { getNewRule } from '../../../objects/rule';
import { ALERTS_COUNT, EMPTY_ALERT_TABLE } from '../../../screens/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import {
  addExceptionFromFirstAlert,
  goToClosedAlertsOnRuleDetailsPage,
  goToOpenedAlertsOnRuleDetailsPage,
} from '../../../tasks/alerts';
import {
  addExceptionEntryFieldValue,
  addExceptionEntryFieldValueValue,
  addExceptionEntryOperatorValue,
  addExceptionFlyoutItemName,
  selectBulkCloseAlerts,
  submitNewExceptionItem,
  validateExceptionItemFirstAffectedRuleNameInRulePage,
  validateExceptionItemAffectsTheCorrectRulesInRulePage,
} from '../../../tasks/exceptions';
import {
  esArchiverLoad,
  esArchiverResetKibana,
  esArchiverUnload,
} from '../../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/rule_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import { postDataView } from '../../../tasks/common';
import { NO_EXCEPTIONS_EXIST_PROMPT } from '../../../screens/exceptions';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';

describe('Rule Exceptions workflows from Alert', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1 alert';
  const ITEM_NAME = 'Sample Exception List Item';
  const newRule = getNewRule();
  beforeEach(() => {
    esArchiverResetKibana();
    esArchiverLoad('exceptions');
    login();
    postDataView('exceptions-*');
    createRule({
      ...newRule,
      query: 'agent.name:*',
      data_view_id: 'exceptions-*',
      interval: '10s',
      rule_id: 'rule_testing',
    });
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    waitForAlertsToPopulate();
  });

  after(() => {
    esArchiverUnload('exceptions');
  });

  afterEach(() => {
    esArchiverUnload('exceptions_2');
  });

  it('Creates an exception item from alert actions overflow menu  and close all matching alerts', () => {
    cy.get(LOADING_INDICATOR).should('not.exist');
    addExceptionFromFirstAlert();

    addExceptionEntryFieldValue('agent.name', 0);
    addExceptionEntryOperatorValue('is', 0);
    addExceptionEntryFieldValueValue('foo', 0);

    addExceptionFlyoutItemName(ITEM_NAME);
    selectBulkCloseAlerts();
    submitNewExceptionItem();

    // Alerts table should now be empty from having added exception and closed
    // matching alert
    cy.get(EMPTY_ALERT_TABLE).should('exist');

    // Closed alert should appear in table
    goToClosedAlertsOnRuleDetailsPage();
    cy.get(ALERTS_COUNT).should('exist');
    cy.get(ALERTS_COUNT).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS}`);

    // Remove the exception and load an event that would have matched that exception
    // to show that said exception now starts to show up again
    goToExceptionsTab();

    // Validate the exception is affecting the correct rule count and name
    validateExceptionItemAffectsTheCorrectRulesInRulePage(1);
    validateExceptionItemFirstAffectedRuleNameInRulePage(newRule.name);

    // when removing exception and again, no more exist, empty screen shows again
    removeException();
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // load more docs
    esArchiverLoad('exceptions_2');

    // now that there are no more exceptions, the docs should match and populate alerts
    goToAlertsTab();
    goToOpenedAlertsOnRuleDetailsPage();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('have.text', '2 alerts');
  });
});
