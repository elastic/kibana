/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import {
  ALERTS_COUNT,
  SELECTED_ALERTS,
  TAKE_ACTION_POPOVER_BTN,
  ALERT_COUNT_TABLE_FIRST_ROW_COUNT,
} from '../../screens/alerts';

import {
  closeAlerts,
  goToClosedAlerts,
  goToOpenedAlerts,
  openFirstAlert,
  selectNumberOfAlerts,
  waitForAlerts,
} from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { loginAndWaitForPage } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { ALERTS_URL } from '../../urls/navigation';

describe('Opening alerts', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(ALERTS_URL);
    createCustomRuleEnabled(getNewRule());
    refreshPage();
    waitForAlertsToPopulate(500);
    selectNumberOfAlerts(5);

    cy.get(SELECTED_ALERTS).should('have.text', `Selected 5 alerts`);

    closeAlerts();
    waitForAlerts();
    refreshPage();
  });

  it('Open one alert when more than one closed alerts are selected', () => {
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((numberOfOpenedAlertsText) => {
        const numberOfOpenedAlerts = parseInt(numberOfOpenedAlertsText, 10);
        goToClosedAlerts();
        cy.get(ALERTS_COUNT)
          .invoke('text')
          .then((alertNumberString) => {
            const numberOfAlerts = alertNumberString.split(' ')[0];
            const numberOfAlertsToBeOpened = 1;
            const numberOfAlertsToBeSelected = 3;

            cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
            selectNumberOfAlerts(numberOfAlertsToBeSelected);
            cy.get(SELECTED_ALERTS).should(
              'have.text',
              `Selected ${numberOfAlertsToBeSelected} alerts`
            );

            // TODO: Popover not shwing up in cypress UI, but code is in the UtilityBar
            // cy.get(TAKE_ACTION_POPOVER_BTN).should('not.have.attr', 'disabled');

            openFirstAlert();
            waitForAlerts();

            const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeOpened;
            cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);
            cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
              'have.text',
              `${expectedNumberOfAlerts}`
            );

            goToOpenedAlerts();
            waitForAlerts();

            cy.get(ALERTS_COUNT).should(
              'have.text',
              `${numberOfOpenedAlerts + numberOfAlertsToBeOpened} alerts`.toString()
            );
            cy.get(ALERT_COUNT_TABLE_FIRST_ROW_COUNT).should(
              'have.text',
              `${numberOfOpenedAlerts + numberOfAlertsToBeOpened}`
            );
          });
      });
  });
});
