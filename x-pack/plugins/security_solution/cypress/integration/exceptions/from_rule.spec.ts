/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getException } from '../../objects/exception';
import { getNewRule } from '../../objects/rule';

import { ALERTS_COUNT, EMPTY_ALERT_TABLE, NUMBER_OF_ALERTS } from '../../screens/alerts';
import { RULE_STATUS } from '../../screens/create_new_rule';

import { goToClosedAlerts, goToOpenedAlerts } from '../../tasks/alerts';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import {
  activatesRule,
  addsExceptionFromRuleSettings,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../../tasks/rule_details';
import { refreshPage } from '../../tasks/security_header';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { cleanKibana, reload } from '../../tasks/common';

describe('From rule', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1';
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    createCustomRule(getNewRule(), 'rule_testing', '10s');
    reload();
    goToRuleDetails();

    cy.get(RULE_STATUS).should('have.text', '—');

    esArchiverLoad('auditbeat_for_exceptions');
    activatesRule();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();
    refreshPage();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS} alert`);
  });

  afterEach(() => {
    esArchiverUnload('auditbeat_for_exceptions');
    esArchiverUnload('auditbeat_for_exceptions2');
  });

  it('Creates an exception and deletes it', () => {
    goToExceptionsTab();
    addsExceptionFromRuleSettings(getException());
    esArchiverLoad('auditbeat_for_exceptions2');
    waitForTheRuleToBeExecuted();
    goToAlertsTab();

    cy.get(EMPTY_ALERT_TABLE).should('exist');

    goToClosedAlerts();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS} alert`);

    goToOpenedAlerts();
    waitForTheRuleToBeExecuted();

    cy.get(EMPTY_ALERT_TABLE).should('exist');

    goToExceptionsTab();
    removeException();
    goToAlertsTab();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS} alert`);
  });
});
