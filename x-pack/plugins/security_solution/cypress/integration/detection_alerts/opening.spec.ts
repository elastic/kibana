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
  closeAlerts,
  goToClosedAlerts,
  goToOpenedAlerts,
  openFirstAlert,
  selectNumberOfAlerts,
  waitForAlerts,
  loadAlertsTableWithAlerts,
} from '../../tasks/alerts';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, waitForPageWithoutDateRange } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';
import { ALERTS_URL } from '../../urls/navigation';

describe('Opening alerts', () => {
  beforeEach(() => {
    cleanKibana();
    loadAlertsTableWithAlerts(getNewRule());

    selectNumberOfAlerts(5);

    cy.get(SELECTED_ALERTS).should('have.text', `Selected 5 alerts`);

    closeAlerts();
    waitForAlerts();
    refreshPage();
    waitForAlertsToPopulate();
  });

  afterEach(() => {
    cleanKibana();
  });

  context('read only user', () => {
    beforeEach(() => {
      login(ROLES.reader);
      waitForPageWithoutDateRange(ALERTS_URL, ROLES.reader);
    });

    it('Does not show user option to select an alert to open', () => {
      goToClosedAlerts();

      // should not see checkboxes. Bulk action options only show when alerts
      // have been selected, hence this check here
      cy.get(ALERT_CHECKBOX).should('not.exist');
    });

    it('Does not show user option to mark alerts as acknowledged', () => {
      goToClosedAlerts();

      // Read only user is read for cases AND alerts, leaving no actions
      // for user to take from table. If this test is failing, it's likely
      // a new action has been added and either not put behind privileges
      // logic or is an action that a read only user can take
      cy.get(TIMELINE_CONTEXT_MENU_BTN).should('not.exist');
    });
  });

  it('Open one alert when more than one closed alerts are selected', () => {
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

            goToOpenedAlerts();
            waitForAlerts();

            cy.get(ALERTS_COUNT).should(
              'have.text',
              `${numberOfOpenedAlerts + numberOfAlertsToBeOpened} alerts`.toString()
            );
          });
      });
  });
});
