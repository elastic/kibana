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
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import {
  enablesRule,
  addsException,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../../tasks/rule_details';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { cleanKibana, reload } from '../../tasks/common';

describe.skip('From alert', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1 alert';

  beforeEach(() => {
    cleanKibana();
    esArchiverLoad('auditbeat_for_exceptions');
    loginAndWaitForPageWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    createCustomRule({ ...getNewRule(), index: ['exceptions-*'] }, 'rule_testing');
    reload();
    goToRuleDetails();
    enablesRule();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS);
  });

  afterEach(() => {
    esArchiverUnload('auditbeat_for_exceptions');
    esArchiverUnload('auditbeat_for_exceptions2');
  });

  it('Creates an exception and deletes it', () => {
    addExceptionFromFirstAlert();
    addsException(getException());
    esArchiverLoad('auditbeat_for_exceptions2');

    cy.get(EMPTY_ALERT_TABLE).should('exist');

    goToClosedAlerts();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS}`);

    goToOpenedAlerts();
    waitForTheRuleToBeExecuted();

    cy.get(EMPTY_ALERT_TABLE).should('exist');

    goToExceptionsTab();
    removeException();
    esArchiverLoad('auditbeat_for_exceptions2');
    goToAlertsTab();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS}`);
  });
});
