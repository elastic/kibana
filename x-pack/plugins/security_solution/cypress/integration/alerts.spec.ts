/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { newRule } from '../objects/rule';
import {
  ALERTS,
  ALERTS_COUNT,
  SELECTED_ALERTS,
  SHOWING_ALERTS,
  TAKE_ACTION_POPOVER_BTN,
} from '../screens/alerts';

import {
  closeFirstAlert,
  closeAlerts,
  goToClosedAlerts,
  goToOpenedAlerts,
  openFirstAlert,
  openAlerts,
  selectNumberOfAlerts,
  waitForAlertsPanelToBeLoaded,
  waitForAlerts,
  waitForAlertsToBeLoaded,
  markInProgressFirstAlert,
  goToInProgressAlerts,
  waitForAlertsIndexToBeCreated,
} from '../tasks/alerts';
import { createCustomRuleActivated } from '../tasks/api_calls/rules';
import { cleanKibana } from '../tasks/common';
import { waitForAlertsToPopulate } from '../tasks/create_new_rule';
import { loginAndWaitForPage } from '../tasks/login';
import { refreshPage } from '../tasks/security_header';

import { DETECTIONS_URL } from '../urls/navigation';

describe.skip('Alerts', () => {
  context('Closing alerts', () => {
    beforeEach(() => {
      cleanKibana();
      loginAndWaitForPage(DETECTIONS_URL);
      waitForAlertsPanelToBeLoaded();
      waitForAlertsIndexToBeCreated();
      createCustomRuleActivated(newRule);
      refreshPage();
      waitForAlertsToPopulate();
    });

    it('Closes and opens alerts', () => {
      const numberOfAlertsToBeClosed = 3;
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfAlerts) => {
          cy.get(SHOWING_ALERTS).should('have.text', `Showing ${numberOfAlerts} alerts`);

          selectNumberOfAlerts(numberOfAlertsToBeClosed);

          cy.get(SELECTED_ALERTS).should(
            'have.text',
            `Selected ${numberOfAlertsToBeClosed} alerts`
          );

          closeAlerts();
          waitForAlerts();

          const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfAlertsAfterClosing.toString());

          cy.get(SHOWING_ALERTS).should(
            'have.text',
            `Showing ${expectedNumberOfAlertsAfterClosing.toString()} alerts`
          );

          goToClosedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', numberOfAlertsToBeClosed.toString());
          cy.get(SHOWING_ALERTS).should(
            'have.text',
            `Showing ${numberOfAlertsToBeClosed.toString()} alerts`
          );
          cy.get(ALERTS).should('have.length', numberOfAlertsToBeClosed);

          const numberOfAlertsToBeOpened = 1;
          selectNumberOfAlerts(numberOfAlertsToBeOpened);

          cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeOpened} alert`);

          openAlerts();
          waitForAlerts();

          const expectedNumberOfClosedAlertsAfterOpened = 2;
          cy.get(ALERTS_COUNT).should(
            'have.text',
            expectedNumberOfClosedAlertsAfterOpened.toString()
          );
          cy.get(SHOWING_ALERTS).should(
            'have.text',
            `Showing ${expectedNumberOfClosedAlertsAfterOpened.toString()} alerts`
          );
          cy.get(ALERTS).should('have.length', expectedNumberOfClosedAlertsAfterOpened);

          goToOpenedAlerts();
          waitForAlerts();

          const expectedNumberOfOpenedAlerts =
            +numberOfAlerts - expectedNumberOfClosedAlertsAfterOpened;
          cy.get(SHOWING_ALERTS).should(
            'have.text',
            `Showing ${expectedNumberOfOpenedAlerts.toString()} alerts`
          );

          cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfOpenedAlerts.toString());
        });
    });

    it('Closes one alert when more than one opened alerts are selected', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfAlerts) => {
          const numberOfAlertsToBeClosed = 1;
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('have.attr', 'disabled');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.have.attr', 'disabled');

          closeFirstAlert();
          waitForAlerts();

          const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfAlerts.toString());
          cy.get(SHOWING_ALERTS).should(
            'have.text',
            `Showing ${expectedNumberOfAlerts.toString()} alerts`
          );

          goToClosedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', numberOfAlertsToBeClosed.toString());
          cy.get(SHOWING_ALERTS).should(
            'have.text',
            `Showing ${numberOfAlertsToBeClosed.toString()} alert`
          );
          cy.get(ALERTS).should('have.length', numberOfAlertsToBeClosed);
        });
    });
  });

  context('Opening alerts', () => {
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

  context('Marking alerts as in-progress', () => {
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
});
