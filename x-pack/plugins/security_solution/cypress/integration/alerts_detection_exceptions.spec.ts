/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { exception } from '../objects/exception';
import { newRule } from '../objects/rule';

import { RULE_STATUS } from '../screens/create_new_rule';
import { SERVER_SIDE_EVENT_COUNT } from '../screens/timeline';

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
  deactivatesRule,
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
    cy.reload(true);
    createCustomRule(newRule);
    goToManageAlertsDetectionRules();
    goToRuleDetails();

    cy.get(RULE_STATUS).should('have.text', '—');

    esArchiverLoad('auditbeat_for_exceptions');
    activatesRule();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();
    refreshPage();

    cy.scrollTo('bottom');
    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfInitialAlertsText) => {
        cy.wrap(parseInt(numberOfInitialAlertsText, 10)).should(
          'eql',
          NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS
        );
      });
    deactivatesRule();
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
      refreshPage();
      activatesRule();
      waitForTheRuleToBeExecuted();
      goToAlertsTab();
      refreshPage();

      goToClosedAlerts();
      refreshPage();

      goToOpenedAlerts();
      waitForTheRuleToBeExecuted();
      refreshPage();

      goToExceptionsTab();
      removeException();
      refreshPage();
      goToAlertsTab();
      waitForTheRuleToBeExecuted();
      refreshPage();
      waitForAlertsToPopulate();
    });
  });

  context('From alert', () => {
    it('Creates an exception and deletes it', () => {
      addExceptionFromFirstAlert();
      refreshPage();
      addsException(exception);
      esArchiverLoad('auditbeat_for_exceptions2');
      refreshPage();
      activatesRule();
      waitForTheRuleToBeExecuted();
      goToClosedAlerts();
      refreshPage();

      goToOpenedAlerts();
      waitForTheRuleToBeExecuted();
      refreshPage();

      goToExceptionsTab();
      removeException();
      refreshPage();
      goToAlertsTab();
      waitForTheRuleToBeExecuted();
      refreshPage();
      waitForAlertsToPopulate();
    });
  });
});
