/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CLOSED_ALERTS_BTN,
  EXPAND_ALERT_BTN,
  LOADING_ALERTS_PANEL,
  MANAGE_ALERT_DETECTION_RULES_BTN,
  OPEN_CLOSE_ALERT_BTN,
  OPEN_CLOSE_ALERTS_BTN,
  OPENED_ALERTS_BTN,
  SEND_ALERT_TO_TIMELINE_BTN,
  ALERTS,
  ALERT_CHECKBOX,
} from '../screens/detections';
import { REFRESH_BUTTON } from '../screens/siem_header';

export const closeFirstAlert = () => {
  cy.get(OPEN_CLOSE_ALERT_BTN).first().click({ force: true });
};

export const closeAlerts = () => {
  cy.get(OPEN_CLOSE_ALERTS_BTN).click({ force: true });
};

export const expandFirstAlert = () => {
  cy.get(EXPAND_ALERT_BTN).first().click({ force: true });
};

export const goToClosedAlerts = () => {
  cy.get(CLOSED_ALERTS_BTN).click({ force: true });
};

export const goToManageAlertDetectionRules = () => {
  cy.get(MANAGE_ALERT_DETECTION_RULES_BTN).should('exist').click({ force: true });
};

export const goToOpenedAlerts = () => {
  cy.get(OPENED_ALERTS_BTN).click({ force: true });
};

export const openFirstAlert = () => {
  cy.get(OPEN_CLOSE_ALERT_BTN).first().click({ force: true });
};

export const openAlerts = () => {
  cy.get(OPEN_CLOSE_ALERTS_BTN).click({ force: true });
};

export const selectNumberOfAlerts = (numberOfAlerts: number) => {
  for (let i = 0; i < numberOfAlerts; i++) {
    cy.get(ALERT_CHECKBOX).eq(i).click({ force: true });
  }
};

export const investigateFirstAlertInTimeline = () => {
  cy.get(SEND_ALERT_TO_TIMELINE_BTN).first().click({ force: true });
};

export const waitForAlerts = () => {
  cy.get(REFRESH_BUTTON).invoke('text').should('not.equal', 'Updating');
};

export const waitForAlertsIndexToBeCreated = () => {
  cy.request({ url: '/api/detection_engine/index', retryOnStatusCodeFailure: true }).then(
    (response) => {
      if (response.status !== 200) {
        cy.wait(7500);
      }
    }
  );
};

export const waitForAlertsPanelToBeLoaded = () => {
  cy.get(LOADING_ALERTS_PANEL).should('exist');
  cy.get(LOADING_ALERTS_PANEL).should('not.exist');
};

export const waitForAlertsToBeLoaded = () => {
  const expectedNumberOfDisplayedAlerts = 25;
  cy.get(ALERTS).should('have.length', expectedNumberOfDisplayedAlerts);
};
