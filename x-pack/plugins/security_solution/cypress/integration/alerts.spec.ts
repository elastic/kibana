/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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
} from '../tasks/alerts';
import { removeSignalsIndex } from '../tasks/api_calls';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPage } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Alerts', () => {
  context('Closing alerts', () => {
    beforeEach(() => {
      esArchiverLoad('alerts');
      loginAndWaitForPage(DETECTIONS_URL);
    });

    afterEach(() => {
      removeSignalsIndex();
      esArchiverUnload('alerts');
    });

    it('Closes and opens alerts', () => {
      waitForAlertsPanelToBeLoaded();
      waitForAlertsToBeLoaded();

      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfAlerts) => {
          cy.get(SHOWING_ALERTS).should('have.text', `Showing ${numberOfAlerts} alerts`);

          const numberOfAlertsToBeClosed = 3;
          selectNumberOfAlerts(numberOfAlertsToBeClosed);

          cy.get(SELECTED_ALERTS).should(
            'have.text',
            `Selected ${numberOfAlertsToBeClosed} alerts`
          );

          closeAlerts();
          waitForAlerts();
          cy.reload();
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
          cy.reload();
          waitForAlertsToBeLoaded();
          waitForAlerts();
          goToClosedAlerts();
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

          cy.get('[data-test-subj="server-side-event-count"]').should(
            'have.text',
            expectedNumberOfOpenedAlerts.toString()
          );
        });
    });

    it('Closes one alert when more than one opened alerts are selected', () => {
      waitForAlertsToBeLoaded();

      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfAlerts) => {
          const numberOfAlertsToBeClosed = 1;
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('have.attr', 'disabled');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.have.attr', 'disabled');

          closeFirstAlert();
          cy.reload();
          waitForAlertsToBeLoaded();
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
      esArchiverLoad('closed_alerts');
      loginAndWaitForPage(DETECTIONS_URL);
    });

    afterEach(() => {
      removeSignalsIndex();
      esArchiverUnload('closed_alerts');
    });

    it('Open one alert when more than one closed alerts are selected', () => {
      waitForAlerts();
      goToClosedAlerts();
      waitForAlertsToBeLoaded();

      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfAlerts) => {
          const numberOfAlertsToBeOpened = 1;
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('have.attr', 'disabled');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.have.attr', 'disabled');

          openFirstAlert();
          cy.reload();
          goToClosedAlerts();
          waitForAlertsToBeLoaded();
          waitForAlerts();

          const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeOpened;
          cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfAlerts.toString());
          cy.get(SHOWING_ALERTS).should(
            'have.text',
            `Showing ${expectedNumberOfAlerts.toString()} alerts`
          );

          goToOpenedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', numberOfAlertsToBeOpened.toString());
          cy.get(SHOWING_ALERTS).should(
            'have.text',
            `Showing ${numberOfAlertsToBeOpened.toString()} alert`
          );
          cy.get(ALERTS).should('have.length', numberOfAlertsToBeOpened);
        });
    });
  });

  context('Marking alerts as in-progress', () => {
    beforeEach(() => {
      esArchiverLoad('alerts');
      loginAndWaitForPage(DETECTIONS_URL);
    });

    afterEach(() => {
      removeSignalsIndex();
      esArchiverUnload('alerts');
    });

    it('Mark one alert in progress when more than one open alerts are selected', () => {
      waitForAlerts();
      waitForAlertsToBeLoaded();

      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfAlerts) => {
          const numberOfAlertsToBeMarkedInProgress = 1;
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('have.attr', 'disabled');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.have.attr', 'disabled');

          markInProgressFirstAlert();
          cy.reload();
          goToOpenedAlerts();
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
