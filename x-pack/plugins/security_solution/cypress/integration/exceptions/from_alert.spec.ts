/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getException } from '../../objects/exception';
import { getNewRule } from '../../objects/rule';

import { ALERTS_COUNT, EMPTY_ALERT_TABLE, NUMBER_OF_ALERTS } from '../../screens/alerts';

import { addExceptionFromFirstAlert, goToClosedAlerts, goToOpenedAlerts } from '../../tasks/alerts';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';
import {
  addsException,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../../tasks/rule_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';

describe('From alert', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1 alert';

  before(() => {
    cleanKibana();
    login();
  });

  beforeEach(() => {
    esArchiverLoad('exceptions');
    deleteAlertsAndRules();
    createCustomRule(
      { ...getNewRule(), customQuery: 'agent.name:*', index: ['exceptions*'] },
      'rule_testing',
      '5s',
      true
    );
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS);
  });

  afterEach(() => {
    esArchiverUnload('exceptions');
    esArchiverUnload('exceptions_2');
  });

  it('Creates an exception and deletes it', () => {
    // Create an exception from the alerts actions menu that matches
    // the existing alert
    addExceptionFromFirstAlert();
    addsException(getException());

    // Alerts table should now be empty from having added exception and closed
    // matching alert
    cy.get(EMPTY_ALERT_TABLE).should('exist');

    // Closed alert should appear in table
    goToClosedAlerts();
    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS}`);

    // Remove the exception and load an event that would have matched that exception
    // to show that said exception now starts to show up again
    goToExceptionsTab();
    removeException();
    esArchiverLoad('exceptions_2');
    goToAlertsTab();
    goToOpenedAlerts();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS}`);
  });
});
