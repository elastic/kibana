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

const numberOfauditbeatExceptionsAlerts = 2;

describe('Exceptions', () => {
  context('From rule', () => {
    before(() => {
      esArchiverLoad('rule_for_exceptions');
    });

    after(() => {
      esArchiverUnload('rule_for_exceptions');
      esArchiverUnload('auditbeat_for_exceptions');
      esArchiverUnload('auditbeat_for_exceptions2');
      esArchiverUnload('auditbeat_for_exceptions3');
    });

    it('Creates an exception and deletes it', () => {
      loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
      waitForAlertsIndexToBeCreated();
      goToManageAlertsDetectionRules();
      goToRuleDetails();

      cy.get(RULE_STATUS).should('have.text', '—');

      esArchiverLoad('auditbeat_for_exceptions');
      activatesRule();
      waitForAlertsToPopulate();
      waitForTheRuleToBeExecuted();
      refreshPage();
      deactivatesRule();
      refreshPage();

      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      cy.get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((numberOfInitialAlertsText) => {
          cy.wrap(parseInt(numberOfInitialAlertsText, 10)).should(
            'eql',
            numberOfauditbeatExceptionsAlerts
          );
        });

      goToExceptionsTab();
      addsExceptionFromRuleSettings(exception);
      activatesRule();

      esArchiverLoad('auditbeat_for_exceptions2');
      refreshPage();
      waitForTheRuleToBeExecuted();
      refreshPage();
      goToAlertsTab();

      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      cy.get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((numberOfAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfAlertsAfterCreatingExceptionText, 10)).should('eql', 0);
        });

      goToClosedAlerts();
      refreshPage();

      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      cy.get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((numberOfClosedAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfClosedAlertsAfterCreatingExceptionText, 10)).should(
            'eql',
            numberOfauditbeatExceptionsAlerts
          );
        });

      goToOpenedAlerts();
      refreshPage();

      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      cy.get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((numberOfOpenedAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfOpenedAlertsAfterCreatingExceptionText, 10)).should('eql', 0);
        });

      goToExceptionsTab();
      removeException();
      esArchiverLoad('auditbeat_for_exceptions3');
      refreshPage();
      goToAlertsTab();
      waitForAlertsToPopulate();
      refreshPage();
      waitForTheRuleToBeExecuted();
      refreshPage();

      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      cy.get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((numberOfAlertsAfterRemovingExceptionsText) => {
          cy.wrap(parseInt(numberOfAlertsAfterRemovingExceptionsText, 10)).should(
            'eql',
            numberOfauditbeatExceptionsAlerts
          );
        });
    });
  });

  context('From alert', () => {
    before(() => {
      esArchiverLoad('rule_for_exceptions_from_alert');
    });

    after(() => {
      esArchiverUnload('rule_for_exceptions_from_alert');
      esArchiverUnload('auditbeat_for_exceptions_from_alert');
      esArchiverUnload('auditbeat_for_exceptions_from_alert2');
      esArchiverUnload('auditbeat_for_exceptions_from_alert3');
    });

    it('Creates an exception and deletes it', () => {
      loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
      waitForAlertsIndexToBeCreated();
      goToManageAlertsDetectionRules();
      goToRuleDetails();

      cy.get(RULE_STATUS).should('have.text', '—');

      esArchiverLoad('auditbeat_for_exceptions_from_alert');
      activatesRule();
      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();
      refreshPage();
      deactivatesRule();
      refreshPage();

      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      cy.get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((numberOfInitialAlertsText) => {
          cy.wrap(parseInt(numberOfInitialAlertsText, 10)).should(
            'eql',
            numberOfauditbeatExceptionsAlerts
          );
        });

      addExceptionFromFirstAlert();
      addsException(exception);
      activatesRule();
      esArchiverLoad('auditbeat_for_exceptions_from_alert2');

      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      cy.get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((numberOfAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfAlertsAfterCreatingExceptionText, 10)).should('eql', 0);
        });

      goToClosedAlerts();
      refreshPage();

      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      cy.get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((numberOfClosedAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfClosedAlertsAfterCreatingExceptionText, 10)).should(
            'eql',
            numberOfauditbeatExceptionsAlerts
          );
        });

      goToOpenedAlerts();
      refreshPage();

      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      cy.get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((numberOfOpenedAlertsAfterCreatingExceptionText) => {
          cy.wrap(parseInt(numberOfOpenedAlertsAfterCreatingExceptionText, 10)).should('eql', 0);
        });

      goToExceptionsTab();
      removeException();
      esArchiverLoad('auditbeat_for_exceptions_from_alert3');
      refreshPage();
      goToAlertsTab();
      waitForTheRuleToBeExecuted();
      refreshPage();
      waitForAlertsToPopulate();
      refreshPage();

      cy.get(SERVER_SIDE_EVENT_COUNT).should('exist');
      cy.get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((numberOfAlertsAfterRemovingExceptionsText) => {
          cy.wrap(parseInt(numberOfAlertsAfterRemovingExceptionsText, 10)).should(
            'eql',
            numberOfauditbeatExceptionsAlerts
          );
        });
    });
  });
});
