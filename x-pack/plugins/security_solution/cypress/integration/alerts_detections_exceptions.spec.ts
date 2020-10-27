/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { exception } from '../objects/exception';

import { RULE_STATUS } from '../screens/create_new_rule';
import { SERVER_SIDE_EVENT_COUNT } from '../screens/timeline';

import {
  addExceptionFromFirstAlert,
  goToClosedAlerts,
  goToManageAlertsDetectionRules,
  goToOpenedAlerts,
  waitForAlertsIndexToBeCreated,
} from '../tasks/alerts';
import { goToRuleDetails } from '../tasks/alerts_detection_rules';
import { waitForAlertsToPopulate } from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  activatesRule,
  addsException,
  addsExceptionFromRuleSettings,
  deactivatesRule,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../tasks/rule_details';
import { refreshPage } from '../tasks/security_header';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Exceptions', () => {
  beforeEach(() => {
    esArchiverLoad('exceptions');
  });

  afterEach(() => {
    esArchiverUnload('exceptions');
  });

  it('Creates an exception from rule details and deletes the exception', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    goToRuleDetails();

    cy.get(RULE_STATUS).should('have.text', '—');

    activatesRule();
    waitForTheRuleToBeExecuted();
    refreshPage();
    waitForAlertsToPopulate();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });

    deactivatesRule();
    goToExceptionsTab();
    addsExceptionFromRuleSettings(exception);
    activatesRule();
    esArchiverLoad('auditbeat');
    waitForTheRuleToBeExecuted();
    refreshPage();
    goToAlertsTab();

    cy.get(SERVER_SIDE_EVENT_COUNT).should('have.attr', 'title', '0');

    goToClosedAlerts();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });

    goToOpenedAlerts();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('eql', 0);
      });

    goToExceptionsTab();
    removeException();
    esArchiverLoad('auditbeat');
    waitForTheRuleToBeExecuted();
    goToAlertsTab();
    goToOpenedAlerts();
    refreshPage();
    waitForAlertsToPopulate();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });
  });

  it('Creates an exception from an alert and deletes the exception', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    goToRuleDetails();

    cy.get(RULE_STATUS).should('have.text', '—');

    activatesRule();
    waitForTheRuleToBeExecuted();
    refreshPage();
    waitForAlertsToPopulate();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });

    deactivatesRule();
    addExceptionFromFirstAlert();
    addsException(exception);
    activatesRule();
    esArchiverLoad('auditbeat');

    cy.get(SERVER_SIDE_EVENT_COUNT).should('have.attr', 'title', '0');

    goToClosedAlerts();
    waitForAlertsToPopulate();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });

    goToOpenedAlerts();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('eql', 0);
      });

    goToExceptionsTab();
    removeException();
    esArchiverLoad('auditbeat');
    goToAlertsTab();
    waitForTheRuleToBeExecuted();
    refreshPage();
    waitForAlertsToPopulate();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });
  });
});
