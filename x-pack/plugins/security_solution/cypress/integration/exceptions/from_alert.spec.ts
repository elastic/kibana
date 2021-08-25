/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getException } from '../../objects/exception';
import { getNewRule } from '../../objects/rule';

import { ALERTS_COUNT, NUMBER_OF_ALERTS } from '../../screens/alerts';
import { RULE_STATUS } from '../../screens/create_new_rule';

import {
  addExceptionFromFirstAlert,
  goToClosedAlerts,
  goToManageAlertsDetectionRules,
  goToOpenedAlerts,
  loadAlertsTableWithAlerts,
  waitForAlertsIndexToBeCreated,
} from '../../tasks/alerts';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import {
  activatesRule,
  addsException,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../../tasks/rule_details';
import { refreshPage } from '../../tasks/security_header';

import { ALERTS_URL } from '../../urls/navigation';
import { cleanKibana, reload } from '../../tasks/common';
import { ROLES } from '../../../common/test';

describe('From alert', () => {
  const NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS = '1';

  beforeEach(() => {
    cleanKibana();
    esArchiverLoad('auditbeat_for_exceptions');
    loadAlertsTableWithAlerts(getNewRule());
    goToManageAlertsDetectionRules();
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
  });

  afterEach(() => {
    cleanKibana();
    esArchiverUnload('auditbeat_for_exceptions');
    esArchiverUnload('auditbeat_for_exceptions2');
  });

  // TODO: Unskip the test when `https://github.com/elastic/kibana/issues/108244` it is fixed
  it('Creates an exception and deletes it', () => {
    addExceptionFromFirstAlert();
    addsException(getException());
    esArchiverLoad('auditbeat_for_exceptions2');

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', '0 alerts');

    goToClosedAlerts();
    refreshPage();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS} alerts`);

    goToOpenedAlerts();
    waitForTheRuleToBeExecuted();
    refreshPage();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', '0 alerts');

    goToExceptionsTab();
    removeException();
    goToAlertsTab();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();
    reload();

    cy.get(ALERTS_COUNT).should('exist');
    cy.get(NUMBER_OF_ALERTS).should('have.text', `${NUMBER_OF_AUDITBEAT_EXCEPTIONS_ALERTS} alerts`);
  });
});
