/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { ALERTS_COUNT, TAKE_ACTION_POPOVER_BTN } from '../../screens/alerts';

import {
  selectNumberOfAlerts,
  waitForAlertsPanelToBeLoaded,
  waitForAlerts,
  markAcknowledgedFirstAlert,
  goToAcknowledgedAlerts,
  waitForAlertsIndexToBeCreated,
} from '../../tasks/alerts';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { loginAndWaitForPage } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { ALERTS_URL } from '../../urls/navigation';

describe('Marking alerts as acknowledged', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(getNewRule());
    refreshPage();
    waitForAlertsToPopulate(500);
  });

  it('Mark one alert as acknowledged when more than one open alerts are selected', () => {
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((alertNumberString) => {
        const numberOfAlerts = alertNumberString.split(' ')[0];
        const numberOfAlertsToBeMarkedAcknowledged = 1;
        const numberOfAlertsToBeSelected = 3;

        cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
        selectNumberOfAlerts(numberOfAlertsToBeSelected);
        cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

        markAcknowledgedFirstAlert();
        const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeMarkedAcknowledged;
        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);

        goToAcknowledgedAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeMarkedAcknowledged} alert`);
      });
  });
});
