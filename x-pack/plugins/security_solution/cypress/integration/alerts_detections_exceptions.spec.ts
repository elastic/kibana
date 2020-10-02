/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { exception } from '../objects/exception';

import { RULE_STATUS } from '../screens/create_new_rule';
import { SERVER_SIDE_EVENT_COUNT } from '../screens/timeline';

import {
  goToClosedAlerts,
  goToManageAlertsDetectionRules,
  goToOpenedAlerts,
  waitForAlertsIndexToBeCreated,
} from '../tasks/alerts';
import { goToRuleDetails } from '../tasks/alerts_detection_rules';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  activatesRule,
  addsException,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../tasks/rule_details';
import { refreshPage } from '../tasks/security_header';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Exceptions', () => {
  before(() => {
    esArchiverLoad('exceptions');
  });

  after(() => {
    esArchiverUnload('exceptions');
  });

  it('Creates an exception from rule details and deletes the excpetion', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    goToRuleDetails();

    cy.get(RULE_STATUS).should('have.text', '—');

    activatesRule();
    waitForTheRuleToBeExecuted();
    refreshPage();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });

    goToExceptionsTab();
    addsException(exception);
    esArchiverLoad('auditbeat');
    goToAlertsTab();

    cy.get(SERVER_SIDE_EVENT_COUNT).should('have.attr', 'title', '0');

    goToClosedAlerts();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });

    goToOpenedAlerts();
    refreshPage();

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

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });
  });
  /* it('Creates an exception from an existing alert');
    it('Deletes an existing exception');*/
});
