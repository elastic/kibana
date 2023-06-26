/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  goToClosedAlertsOnRuleDetailsPage,
  goToOpenedAlertsOnRuleDetailsPage,
  openAddEndpointExceptionFromFirstAlert,
} from '../../../tasks/alerts';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { getEndpointRule } from '../../../objects/rule';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/create_new_rule';
import {
  esArchiverLoad,
  esArchiverResetKibana,
  esArchiverUnload,
} from '../../../tasks/es_archiver';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import {
  addExceptionFlyoutItemName,
  selectCloseSingleAlerts,
  submitNewExceptionItem,
  validateExceptionConditionField,
} from '../../../tasks/exceptions';
import { ALERTS_COUNT, EMPTY_ALERT_TABLE } from '../../../screens/alerts';
import { NO_EXCEPTIONS_EXIST_PROMPT } from '../../../screens/exceptions';
import {
  removeException,
  goToAlertsTab,
  goToEndpointExceptionsTab,
} from '../../../tasks/rule_details';

describe('Endpoint Exceptions workflows from Alert', () => {
  const expectedNumberOfAlerts = 1;
  before(() => {
    esArchiverResetKibana();
  });
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    esArchiverLoad('endpoint');
    createRule(getEndpointRule());
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();
  });

  after(() => {
    esArchiverUnload('endpoint');
    esArchiverUnload('endpoint_2');
  });

  it('Should be able to create and close single Endpoint exception from overflow menu', () => {
    // The Endpoint will populated with predefined fields
    openAddEndpointExceptionFromFirstAlert();

    // As the endpoint.alerts-* is used to trigger the alert the
    // file.Ext.code_signature will be auto-populated
    validateExceptionConditionField('file.Ext.code_signature');

    selectCloseSingleAlerts();
    addExceptionFlyoutItemName('Sample Exception');
    submitNewExceptionItem();

    // Alerts table should now be empty from having added exception and closed
    // matching alert
    cy.get(EMPTY_ALERT_TABLE).should('exist');

    // Closed alert should appear in table
    goToClosedAlertsOnRuleDetailsPage();
    cy.get(ALERTS_COUNT).should('exist');
    cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alert`);

    // Endpoint Exception will move to Endpoint List under Exception tab of rule
    goToEndpointExceptionsTab();

    // Remove the exception and load an event that would have matched that exception
    // to show that said exception now starts to show up again
    removeException();
    // when removing exception and again, no more exist, empty screen shows again
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // load more docs
    esArchiverLoad('endpoint_2');

    goToAlertsTab();
    goToOpenedAlertsOnRuleDetailsPage();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alert`);
  });
});
