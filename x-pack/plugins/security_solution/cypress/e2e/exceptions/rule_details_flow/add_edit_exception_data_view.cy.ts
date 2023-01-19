/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOADING_INDICATOR } from '../../../screens/security_header';
import { getNewRule } from '../../../objects/rule';
import { ALERTS_COUNT, EMPTY_ALERT_TABLE, NUMBER_OF_ALERTS } from '../../../screens/alerts';
import { createCustomRuleEnabled } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import {
  addExceptionFromFirstAlert,
  goToClosedAlerts,
  goToOpenedAlerts,
} from '../../../tasks/alerts';
import {
  addExceptionConditions,
  addExceptionFlyoutItemName,
  editException,
  editExceptionFlyoutItemName,
  selectBulkCloseAlerts,
  submitEditedExceptionItem,
  submitNewExceptionItem,
} from '../../../tasks/exceptions';
import {
  esArchiverLoad,
  esArchiverUnload,
  esArchiverResetKibana,
} from '../../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  addFirstExceptionFromRuleDetails,
  goToAlertsTab,
  goToExceptionsTab,
  openEditException,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/rule_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import { postDataView, deleteAlertsAndRules } from '../../../tasks/common';
import {
  NO_EXCEPTIONS_EXIST_PROMPT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  EXCEPTION_ITEM_CONTAINER,
  FIELD_INPUT,
  VALUES_INPUT,
} from '../../../screens/exceptions';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';

describe('Add exception using data views from rule details', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1 alert';
  const ITEM_NAME = 'Sample Exception List Item';

  before(() => {
    esArchiverResetKibana();
    esArchiverLoad('exceptions');
    login();
    postDataView('exceptions-*');
  });

  after(() => {
    esArchiverUnload('exceptions');
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createCustomRuleEnabled(
      {
        ...getNewRule(),
        customQuery: 'agent.name:*',
        dataSource: { dataView: 'exceptions-*', type: 'dataView' },
        runsEvery: {
          interval: '1',
          timeType: 'Seconds',
          type: 's',
        },
      },
      'rule_testing'
    );
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    waitForAlertsToPopulate();
  });

  afterEach(() => {
    esArchiverUnload('exceptions_2');
  });

  it('Creates an exception item from alert actions overflow menu', () => {
    cy.get(LOADING_INDICATOR).should('not.exist');
    addExceptionFromFirstAlert();
    addExceptionConditions({
      field: 'agent.name',
      operator: 'is',
      values: ['foo'],
    });
    addExceptionFlyoutItemName(ITEM_NAME);
    selectBulkCloseAlerts();
    submitNewExceptionItem();

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

    // when removing exception and again, no more exist, empty screen shows again
    removeException();
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // load more docs
    esArchiverLoad('exceptions_2');

    // now that there are no more exceptions, the docs should match and populate alerts
    goToAlertsTab();
    goToOpenedAlerts();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', '2 alerts');
  });

  it('Creates an exception item', () => {
    goToExceptionsTab();
    // when no exceptions exist, empty component shows with action to add exception
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // clicks prompt button to add first exception that will also select to close
    // all matching alerts
    addFirstExceptionFromRuleDetails(
      {
        field: 'agent.name',
        operator: 'is',
        values: ['foo'],
      },
      ITEM_NAME
    );

    // new exception item displays
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

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

    // when removing exception and again, no more exist, empty screen shows again
    removeException();
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // load more docs
    esArchiverLoad('exceptions_2');

    // now that there are no more exceptions, the docs should match and populate alerts
    goToAlertsTab();
    goToOpenedAlerts();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', '2 alerts');
  });

  it('Edits an exception item', () => {
    const NEW_ITEM_NAME = 'Exception item-EDITED';
    const ITEM_FIELD = 'unique_value.test';
    const FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD = 'agent.name';

    goToExceptionsTab();
    // add item to edit
    addFirstExceptionFromRuleDetails(
      {
        field: ITEM_FIELD,
        operator: 'is',
        values: ['foo'],
      },
      ITEM_NAME
    );

    // displays existing exception items
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');
    cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', ITEM_NAME);
    cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should('have.text', ' unique_value.testIS foo');

    // open edit exception modal
    openEditException();

    // edit exception item name
    editExceptionFlyoutItemName(NEW_ITEM_NAME);

    // check that the existing item's field is being populated
    cy.get(EXCEPTION_ITEM_CONTAINER).eq(0).find(FIELD_INPUT).eq(0).should('have.text', ITEM_FIELD);
    cy.get(VALUES_INPUT).should('have.text', 'foo');

    // edit conditions
    editException(FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD, 0, 0);

    // submit
    submitEditedExceptionItem();

    // new exception item displays
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

    // check that updates stuck
    cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', NEW_ITEM_NAME);
    cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should('have.text', ' agent.nameIS foo');
  });
});
