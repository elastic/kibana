/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '../../../common/test';
import { getNewRule } from '../../objects/rule';
import {
  ALERTS_COUNT,
  ALERT_CHECKBOX,
  SELECTED_ALERTS,
  TAKE_ACTION_POPOVER_BTN,
  TIMELINE_CONTEXT_MENU_BTN,
} from '../../screens/alerts';

import {
  closeFirstAlert,
  closeAlerts,
  goToClosedAlerts,
  selectNumberOfAlerts,
  waitForAlerts,
  waitForAlertsPanelToBeLoaded,
  waitForAlertsIndexToBeCreated,
} from '../../tasks/alerts';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import {
  login,
  loginAndWaitForPageWithoutDateRange,
  waitForPageWithoutDateRange,
} from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';

describe('Closing alerts', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(ALERTS_URL, ROLES.platform_engineer);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(getNewRule(), '1', '100m', 100);
    loginAndWaitForPageWithoutDateRange(ALERTS_URL, ROLES.platform_engineer);
    waitForAlertsToPopulate(100);
  });

  afterEach(() => {
    cleanKibana();
  });

  context('read only user', () => {
    beforeEach(() => {
      login(ROLES.reader);
      waitForPageWithoutDateRange(ALERTS_URL, ROLES.reader);
    });

    it('Does not show user option to select an alert to close', () => {
      // should not see checkboxes. Bulk action options only show when alerts
      // have been selected, hence this check here
      cy.get(ALERT_CHECKBOX).should('not.exist');
    });

    it('Does not show user option to mark alerts as acknowledged', () => {
      // Read only user is read for cases AND alerts, leaving no actions
      // for user to take from table. If this test is failing, it's likely
      // a new action has been added and either not put behind privileges
      // logic or is an action that a read only user can take
      cy.get(TIMELINE_CONTEXT_MENU_BTN).should('not.exist');
    });
  });

  it('Closes alerts', () => {
    const numberOfAlertsToBeClosed = 3;
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((alertNumberString) => {
        const numberOfAlerts = alertNumberString.split(' ')[0];
        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);

        selectNumberOfAlerts(numberOfAlertsToBeClosed);

        cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeClosed} alerts`);

        closeAlerts();
        waitForAlerts();

        const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);

        goToClosedAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alerts`);
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

        goToClosedAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alert`);
      });
  });
});
