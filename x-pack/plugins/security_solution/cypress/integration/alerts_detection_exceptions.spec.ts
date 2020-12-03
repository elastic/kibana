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
import { createCustomRule, deleteCustomRule, removeSignalsIndex } from '../tasks/api_calls';
import { goToRuleDetails } from '../tasks/alerts_detection_rules';
import { waitForAlertsToPopulate } from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  activatesRule,
  addsException,
  addsExceptionFromRuleSettings,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../tasks/rule_details';
import { refreshPage } from '../tasks/security_header';

import { DETECTIONS_URL } from '../urls/navigation';

const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = 1;

describe('Exceptions', () => {
  beforeEach(() => {
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
    cy.get(NUMBER_OF_ALERTS)
      .invoke('text')
      .then((numberOfInitialAlertsText) => {
        cy.wrap(parseInt(numberOfInitialAlertsText, 10)).should(
          'eql',
          NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS
        );
      });
  });

  afterEach(() => {
    esArchiverUnload('auditbeat_for_exceptions');
    esArchiverUnload('auditbeat_for_exceptions2');
    removeSignalsIndex();
    deleteCustomRule();
  });
  context('From rule', () => {
    it('Creates an exception and deletes it', () => {
      goToExceptionsTab();
      addsExceptionFromRuleSettings(exception);
      esArchiverLoad('auditbeat_for_exceptions2');
      waitForTheRuleToBeExecuted();
      goToAlertsTab();
      refreshPage();

      cy.get(ALERTS_COUNT).should('exist');
      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .then((numberOfAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfAlertsAfterCreatingExceptionText, 10)).should('eql', 0);
        });

      goToClosedAlerts();
      refreshPage();

      cy.get(ALERTS_COUNT).should('exist');
      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .then((numberOfClosedAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfClosedAlertsAfterCreatingExceptionText, 10)).should(
            'eql',
            NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS
          );
        });

      goToOpenedAlerts();
      waitForTheRuleToBeExecuted();
      refreshPage();

      cy.get(ALERTS_COUNT).should('exist');
      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .then((numberOfOpenedAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfOpenedAlertsAfterCreatingExceptionText, 10)).should('eql', 0);
        });

      goToExceptionsTab();
      removeException();
      refreshPage();
      goToAlertsTab();
      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();
      refreshPage();

      cy.get(ALERTS_COUNT).should('exist');
      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .then((numberOfAlertsAfterRemovingExceptionsText) => {
          cy.wrap(parseInt(numberOfAlertsAfterRemovingExceptionsText, 10)).should(
            'eql',
            NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS
          );
        });
    });
  });

  context('From alert', () => {
    it('Creates an exception and deletes it', () => {
      addExceptionFromFirstAlert();
      addsException(exception);
      esArchiverLoad('auditbeat_for_exceptions2');

      cy.get(ALERTS_COUNT).should('exist');
      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .then((numberOfAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfAlertsAfterCreatingExceptionText, 10)).should('eql', 0);
        });

      goToClosedAlerts();
      refreshPage();

      cy.get(ALERTS_COUNT).should('exist');
      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .then((numberOfClosedAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfClosedAlertsAfterCreatingExceptionText, 10)).should(
            'eql',
            NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS
          );
        });

      goToOpenedAlerts();
      waitForTheRuleToBeExecuted();
      refreshPage();

      cy.get(ALERTS_COUNT).should('exist');
      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .then((numberOfOpenedAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfOpenedAlertsAfterCreatingExceptionText, 10)).should('eql', 0);
        });

      goToExceptionsTab();
      removeException();
      goToAlertsTab();
      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();
      refreshPage();

      cy.get(ALERTS_COUNT).should('exist');
      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .then((numberOfAlertsAfterRemovingExceptionsText) => {
          cy.wrap(parseInt(numberOfAlertsAfterRemovingExceptionsText, 10)).should(
            'eql',
            NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS
          );
        });
    });
  });
});
