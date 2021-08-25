/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '../../../common/test';
import {
  ALERTS_COUNT,
  ALERT_CHECKBOX,
  TAKE_ACTION_POPOVER_BTN,
  TIMELINE_CONTEXT_MENU_BTN,
} from '../../screens/alerts';
import { getNewRule } from '../../objects/rule';
import {
  selectNumberOfAlerts,
  waitForAlerts,
  waitForAlertsToBeLoaded,
  markAcknowledgedFirstAlert,
  goToAcknowledgedAlerts,
  loadAlertsTableWithAlerts,
  goToOpenedAlerts,
} from '../../tasks/alerts';
import { cleanKibana } from '../../tasks/common';
import { refreshPage } from '../../tasks/security_header';
import { ALERTS_URL } from '../../urls/navigation';
import { login, postRoleAndUser, waitForPageWithoutDateRange } from '../../tasks/login';

describe('Marking alerts as acknowledged', () => {
  beforeEach(() => {
    cleanKibana();
    postRoleAndUser(ROLES.reader);
    loadAlertsTableWithAlerts(getNewRule(), 100);
  });

  afterEach(() => {
    cleanKibana();
  });

  context('read only user', () => {
    beforeEach(() => {
      login(ROLES.reader);
      waitForPageWithoutDateRange(ALERTS_URL, ROLES.reader);
    });

    it('Does not show user option to select an alert', () => {
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
        refreshPage();
        waitForAlertsToBeLoaded(1);
        goToOpenedAlerts();
        const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeMarkedAcknowledged;
        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);

        goToAcknowledgedAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeMarkedAcknowledged} alert`);
      });
  });
});
