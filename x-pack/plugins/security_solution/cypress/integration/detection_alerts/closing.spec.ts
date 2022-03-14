/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { ROLES } from '../../../common/test';
import {
  ALERTS_COUNT,
  SELECTED_ALERTS,
  TAKE_ACTION_POPOVER_BTN,
  ALERT_COUNT_TABLE_FIRST_ROW_COUNT,
  ALERTS_TREND_SIGNAL_RULE_NAME_PANEL,
} from '../../screens/alerts';

import {
  closeFirstAlert,
  closeAlerts,
  goToClosedAlerts,
  goToOpenedAlerts,
  openAlerts,
  selectNumberOfAlerts,
  waitForAlerts,
} from '../../tasks/alerts';
import { createCustomRuleEnabled, deleteCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { loginAndWaitForPage } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { ALERTS_URL } from '../../urls/navigation';

describe('Closing alerts', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(ALERTS_URL);
    createCustomRuleEnabled(getNewRule(), '1', '100m', 100);
    refreshPage();
    waitForAlertsToPopulate(100);
    deleteCustomRule();
  });

  it('Closes and opens alerts', () => {
    const numberOfAlertsToBeClosed = 3;
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((alertNumberString) => {
        const numberOfAlerts = alertNumberString.split(' ')[0];
        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should('have.text', `${numberOfAlerts}`);

        selectNumberOfAlerts(numberOfAlertsToBeClosed);

        cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeClosed} alerts`);

        closeAlerts();
        waitForAlerts();

        const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
          'have.text',
          `${expectedNumberOfAlertsAfterClosing}`
        );

        goToClosedAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alerts`);

        const numberOfAlertsToBeOpened = 1;
        selectNumberOfAlerts(numberOfAlertsToBeOpened);

        cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeOpened} alert`);

        openAlerts();
        waitForAlerts();

        const expectedNumberOfClosedAlertsAfterOpened = 2;
        cy.get(ALERTS_COUNT).should(
          'have.text',
          `${expectedNumberOfClosedAlertsAfterOpened} alerts`
        );
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
          'have.text',
          `${expectedNumberOfClosedAlertsAfterOpened}`
        );

        goToOpenedAlerts();
        waitForAlerts();

        const expectedNumberOfOpenedAlerts =
          +numberOfAlerts - expectedNumberOfClosedAlertsAfterOpened;

        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfOpenedAlerts} alerts`);
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
          'have.text',
          `${expectedNumberOfOpenedAlerts}`
        );
      });
  });

  it('Closes one alert when more than one opened alerts are selected', () => {
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((alertNumberString) => {
        const numberOfAlerts = alertNumberString.split(' ')[0];
        const numberOfAlertsToBeClosed = 1;
        const numberOfAlertsToBeSelected = 3;

        cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
        selectNumberOfAlerts(numberOfAlertsToBeSelected);
        cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

        closeFirstAlert();
        waitForAlerts();

        const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeClosed;
        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should('have.text', `${expectedNumberOfAlerts}`);

        goToClosedAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alert`);
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
          'have.text',
          `${numberOfAlertsToBeClosed}`
        );
      });
  });

  it('Updates trend histogram whenever alert status is updated in table', () => {
    const numberOfAlertsToBeClosed = 1;
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((alertNumberString) => {
        const numberOfAlerts = alertNumberString.split(' ')[0];
        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should('have.text', `${numberOfAlerts}`);

        selectNumberOfAlerts(numberOfAlertsToBeClosed);

        cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeClosed} alert`);

        closeAlerts();
        waitForAlerts();

        const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
          'have.text',
          `${expectedNumberOfAlertsAfterClosing}`
        );

        goToClosedAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alert`);

        const numberOfAlertsToBeOpened = 1;
        selectNumberOfAlerts(numberOfAlertsToBeOpened);

        cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeOpened} alert`);
        cy.get(ALERTS_TREND_SIGNAL_RULE_NAME_PANEL).should('exist');

        openAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('not.exist');
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should('not.exist');
        cy.get(ALERTS_TREND_SIGNAL_RULE_NAME_PANEL).should('not.exist');
      });
  });
});

describe('Closing alerts with read only role', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(ALERTS_URL, ROLES.t2_analyst);
    createCustomRuleEnabled(getNewRule(), '1', '100m', 100);
    refreshPage();
    waitForAlertsToPopulate(100);
    deleteCustomRule();
  });

  it('Closes alerts', () => {
    const numberOfAlertsToBeClosed = 3;
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((alertNumberString) => {
        const numberOfAlerts = alertNumberString.split(' ')[0];
        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should('have.text', `${numberOfAlerts}`);

        selectNumberOfAlerts(numberOfAlertsToBeClosed);

        cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeClosed} alerts`);

        closeAlerts();
        waitForAlerts();

        const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);
        cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
          'have.text',
          `${expectedNumberOfAlertsAfterClosing}`
        );

        goToClosedAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alerts`);
      });
  });
});
