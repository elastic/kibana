/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { newRule } from '../../objects/rule';
import {
  ALERTS,
  ALERTS_COUNT,
  SHOWING_ALERTS,
  TAKE_ACTION_POPOVER_BTN,
} from '../../screens/alerts';

import {
  selectNumberOfAlerts,
  waitForAlertsPanelToBeLoaded,
  waitForAlerts,
  waitForAlertsToBeLoaded,
  markInProgressFirstAlert,
  goToInProgressAlerts,
  waitForAlertsIndexToBeCreated,
} from '../../tasks/alerts';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { loginAndWaitForPage } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { DETECTIONS_URL } from '../../urls/navigation';

describe('Marking alerts as in-progress', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(newRule);
    refreshPage();
    waitForAlertsToPopulate();
  });

  it('Mark one alert in progress when more than one open alerts are selected', () => {
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((numberOfAlerts) => {
        const numberOfAlertsToBeMarkedInProgress = 1;
        const numberOfAlertsToBeSelected = 3;

        cy.get(TAKE_ACTION_POPOVER_BTN).should('have.attr', 'disabled');
        selectNumberOfAlerts(numberOfAlertsToBeSelected);
        cy.get(TAKE_ACTION_POPOVER_BTN).should('not.have.attr', 'disabled');

        markInProgressFirstAlert();
        waitForAlertsToBeLoaded();

        const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeMarkedInProgress;
        cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfAlerts.toString());
        cy.get(SHOWING_ALERTS).should(
          'have.text',
          `Showing ${expectedNumberOfAlerts.toString()} alerts`
        );

        goToInProgressAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', numberOfAlertsToBeMarkedInProgress.toString());
        cy.get(SHOWING_ALERTS).should(
          'have.text',
          `Showing ${numberOfAlertsToBeMarkedInProgress.toString()} alert`
        );
        cy.get(ALERTS).should('have.length', numberOfAlertsToBeMarkedInProgress);
      });
  });
});
