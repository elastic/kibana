/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  goToClosedAlertsOnRuleDetailsPage,
  openAddEndpointExceptionFromFirstAlert,
} from '../../../tasks/alerts';
import { deleteAlertsAndRules } from '../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { getEndpointRule } from '../../../objects/rule';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { createCustomRuleEnabled } from '../../../tasks/api_calls/rules';
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
} from '../../../tasks/exceptions';
import { ALERTS_COUNT, EMPTY_ALERT_TABLE } from '../../../screens/alerts';
import { NO_EXCEPTIONS_EXIST_PROMPT } from '../../../screens/exceptions';
import {
  removeException,
  goToAlertsTab,
  goToEndpointExceptionsTab,
} from '../../../tasks/rule_details';

describe('Add Endpoint exception from alerts table and close it', () => {
  const ITEM_NAME = 'Sample Exception';

  before(() => {
    esArchiverResetKibana();
    esArchiverLoad('endpoint');
    login();
    deleteAlertsAndRules();
    createCustomRuleEnabled(getEndpointRule());
  });
  beforeEach(() => {
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();
  });
  after(() => {
    esArchiverUnload('endpoint');
  });

  it('Creates an exception item from alert actions overflow menu', () => {
    openAddEndpointExceptionFromFirstAlert();
    selectCloseSingleAlerts();
    addExceptionFlyoutItemName(ITEM_NAME);
    submitNewExceptionItem();

    // Alerts table should now be empty from having added exception and closed
    // matching alert
    cy.get(EMPTY_ALERT_TABLE).should('exist');

    // Closed alert should appear in table
    goToClosedAlertsOnRuleDetailsPage();
    cy.get(ALERTS_COUNT).should('exist');

    // Remove the exception and load an event that would have matched that exception
    // to show that said exception now starts to show up again
    goToEndpointExceptionsTab();

    // when removing exception and again, no more exist, empty screen shows again
    removeException();
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // load more docs
    esArchiverLoad('endpoint');

    // now that there are no more exceptions, the docs should match and populate alerts
    goToAlertsTab();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('exist');
  });
});
