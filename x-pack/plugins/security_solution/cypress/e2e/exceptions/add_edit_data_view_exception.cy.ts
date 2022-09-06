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
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload, esArchiverResetKibana } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';
import {
  addsException,
  addsExceptionFromRuleSettings,
  editException,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../../tasks/rule_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { deleteAlertsAndRules, postDataView } from '../../tasks/common';
import {
  EXCEPTION_EDIT_FLYOUT_SAVE_BTN,
  EXCEPTION_ITEM_CONTAINER,
  FIELD_INPUT,
} from '../../screens/exceptions';
import {
  addExceptionEntryFieldValueOfItemX,
  addExceptionEntryFieldValueValue,
} from '../../tasks/exceptions';

describe('Adds rule exception using data views', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1 alert';

  before(() => {
    esArchiverResetKibana();
    esArchiverLoad('exceptions');
    login();

    postDataView('exceptions-*');
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createCustomRuleEnabled(
      {
        ...getNewRule(),
        customQuery: 'agent.name:*',
        dataSource: { dataView: 'exceptions-*', type: 'dataView' },
      },
      'rule_testing',
      '1s'
    );
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();
  });

  afterEach(() => {
    esArchiverUnload('exceptions_2');
  });

  after(() => {
    esArchiverUnload('exceptions');
  });

  it('Creates an exception from an alert and deletes it', () => {
    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS);
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

  it('Creates an exception from a rule and deletes it', () => {
    // Create an exception from the exception tab that matches
    // the existing alert
    goToExceptionsTab();
    addsExceptionFromRuleSettings(getException());

    // Alerts table should now be empty from having added exception and closed
    // matching alert
    goToAlertsTab();
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

  it('Edits an exception', () => {
    goToExceptionsTab();
    addsExceptionFromRuleSettings(getException());

    editException();

    // check that the existing item's field is being populated
    cy.get(EXCEPTION_ITEM_CONTAINER)
      .eq(0)
      .find(FIELD_INPUT)
      .eq(0)
      .should('have.text', 'agent.name');

    // check that you can select a different field
    addExceptionEntryFieldValueOfItemX('user.name{downarrow}{enter}', 0, 0);
    addExceptionEntryFieldValueValue('test', 0);

    cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).click();
    cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).should('have.attr', 'disabled');
    cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).should('not.exist');
  });
});
