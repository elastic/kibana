/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CLOSED_ALERTS_FILTER_BTN,
  EXPAND_ALERT_BTN,
  LOADING_ALERTS_PANEL,
  MANAGE_ALERT_DETECTION_RULES_BTN,
  OPENED_ALERTS_FILTER_BTN,
  SEND_ALERT_TO_TIMELINE_BTN,
  ALERTS,
  ALERT_CHECKBOX,
  TIMELINE_CONTEXT_MENU_BTN,
  CLOSE_ALERT_BTN,
  TAKE_ACTION_POPOVER_BTN,
  CLOSE_SELECTED_ALERTS_BTN,
  IN_PROGRESS_ALERTS_FILTER_BTN,
  OPEN_ALERT_BTN,
  OPEN_SELECTED_ALERTS_BTN,
  MARK_ALERT_IN_PROGRESS_BTN,
  MARK_SELECTED_ALERTS_IN_PROGRESS_BTN,
} from '../screens/alerts';
import { REFRESH_BUTTON } from '../screens/security_header';

export const closeFirstAlert = () => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).first().click({ force: true });
  cy.get(CLOSE_ALERT_BTN).click();
};

export const closeAlerts = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click({ force: true });
  cy.get(CLOSE_SELECTED_ALERTS_BTN).click();
};

export const expandFirstAlert = () => {
  cy.get(EXPAND_ALERT_BTN).first().click({ force: true });
};

export const goToClosedAlerts = () => {
  cy.get(CLOSED_ALERTS_FILTER_BTN).click({ force: true });
};

export const goToManageAlertsDetectionRules = () => {
  cy.get(MANAGE_ALERT_DETECTION_RULES_BTN).should('exist').click({ force: true });
};

export const goToOpenedAlerts = () => {
  cy.get(OPENED_ALERTS_FILTER_BTN).click({ force: true });
};

export const openFirstAlert = () => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).first().click({ force: true });
  cy.get(OPEN_ALERT_BTN).click();
};

export const openAlerts = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click({ force: true });
  cy.get(OPEN_SELECTED_ALERTS_BTN).click();
};

export const goToInProgressAlerts = () => {
  cy.get(IN_PROGRESS_ALERTS_FILTER_BTN).click({ force: true });
};

export const markInProgressFirstAlert = () => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).first().click({ force: true });
  cy.get(MARK_ALERT_IN_PROGRESS_BTN).click();
};

export const markInProgressAlerts = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click({ force: true });
  cy.get(MARK_SELECTED_ALERTS_IN_PROGRESS_BTN).click();
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
