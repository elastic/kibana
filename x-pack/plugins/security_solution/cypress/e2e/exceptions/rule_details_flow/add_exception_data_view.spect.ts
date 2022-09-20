/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { ALERTS_COUNT, EMPTY_ALERT_TABLE, NUMBER_OF_ALERTS } from '../../../screens/alerts';
import { createCustomRuleEnabled } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { goToClosedAlerts, goToOpenedAlerts } from '../../../tasks/alerts';
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
  removeException,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/rule_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import { postDataView, deleteAlertsAndRules } from '../../../tasks/common';
import {
  NO_EXCEPTIONS_EXIST_PROMPT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
} from '../../../screens/exceptions';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';

describe('Add exception using data views from rule details', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1 alert';

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
      },
      'rule_testing',
      '1s'
    );
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    goToExceptionsTab();
  });

  afterEach(() => {
    esArchiverUnload('exceptions_2');
  });

  it('Creates an exception item when none exist', () => {
    // when no exceptions exist, empty component shows with action to add exception
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // clicks prompt button to add first exception that will also select to close
    // all matching alerts
    addFirstExceptionFromRuleDetails({
      field: 'agent.name',
      operator: 'is',
      values: ['foo'],
    });

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
});
