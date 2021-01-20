/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { newRule } from '../../objects/rule';
import {
  ALERTS_COUNT,
  SELECTED_ALERTS,
  SHOWING_ALERTS,
  TAKE_ACTION_POPOVER_BTN,
} from '../../screens/alerts';

import {
  closeAlerts,
  goToClosedAlerts,
  goToOpenedAlerts,
  openFirstAlert,
  selectNumberOfAlerts,
  waitForAlertsPanelToBeLoaded,
  waitForAlerts,
  waitForAlertsIndexToBeCreated,
} from '../../tasks/alerts';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { loginAndWaitForPage } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { DETECTIONS_URL } from '../../urls/navigation';

describe('Opening alerts', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(newRule);
    refreshPage();
    waitForAlertsToPopulate();
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
          .then((numberOfAlerts) => {
            const numberOfAlertsToBeOpened = 1;
            const numberOfAlertsToBeSelected = 3;

            cy.get(TAKE_ACTION_POPOVER_BTN).should('have.attr', 'disabled');
            selectNumberOfAlerts(numberOfAlertsToBeSelected);
            cy.get(SELECTED_ALERTS).should(
              'have.text',
              `Selected ${numberOfAlertsToBeSelected} alerts`
            );

            cy.get(TAKE_ACTION_POPOVER_BTN).should('not.have.attr', 'disabled');

            openFirstAlert();
            waitForAlerts();

            const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeOpened;
            cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfAlerts.toString());
            cy.get(SHOWING_ALERTS).should(
              'have.text',
              `Showing ${expectedNumberOfAlerts.toString()} alerts`
            );

            goToOpenedAlerts();
            waitForAlerts();

            cy.get(ALERTS_COUNT).should(
              'have.text',
              (numberOfOpenedAlerts + numberOfAlertsToBeOpened).toString()
            );
            cy.get(SHOWING_ALERTS).should(
              'have.text',
              `Showing ${(numberOfOpenedAlerts + numberOfAlertsToBeOpened).toString()} alerts`
            );
          });
      });
  });
});
