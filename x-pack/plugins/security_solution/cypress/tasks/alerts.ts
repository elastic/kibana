/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_EXCEPTION_BTN,
  ALERT_RISK_SCORE_HEADER,
  ALERT_CHECKBOX,
  CLOSE_ALERT_BTN,
  CLOSE_SELECTED_ALERTS_BTN,
  CLOSED_ALERTS_FILTER_BTN,
  EXPAND_ALERT_BTN,
  ACKNOWLEDGED_ALERTS_FILTER_BTN,
  LOADING_ALERTS_PANEL,
  MANAGE_ALERT_DETECTION_RULES_BTN,
  MARK_ALERT_ACKNOWLEDGED_BTN,
  MARK_SELECTED_ALERTS_ACKNOWLEDGED_BTN,
  OPEN_ALERT_BTN,
  OPENED_ALERTS_FILTER_BTN,
  SEND_ALERT_TO_TIMELINE_BTN,
  TAKE_ACTION_POPOVER_BTN,
  TIMELINE_CONTEXT_MENU_BTN,
  SELECT_EVENT_CHECKBOX,
} from '../screens/alerts';
import { LOADING_INDICATOR, REFRESH_BUTTON } from '../screens/security_header';
import { TIMELINE_COLUMN_SPINNER } from '../screens/timeline';
import {
  UPDATE_ENRICHMENT_RANGE_BUTTON,
  ENRICHMENT_QUERY_END_INPUT,
  ENRICHMENT_QUERY_RANGE_PICKER,
  ENRICHMENT_QUERY_START_INPUT,
  THREAT_INTEL_TAB,
} from '../screens/alerts_details';

export const addExceptionFromFirstAlert = () => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).first().click();
  cy.get(ADD_EXCEPTION_BTN).click();
};

export const closeFirstAlert = () => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN)
    .first()
    .pipe(($el) => $el.trigger('click'))
    .should('be.visible');

  cy.get(CLOSE_ALERT_BTN)
    .pipe(($el) => $el.trigger('click'))
    .should('not.exist');
};

export const closeAlerts = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN)
    .first()
    .pipe(($el) => $el.trigger('click'))
    .should('be.visible');

  cy.get(CLOSE_SELECTED_ALERTS_BTN)
    .pipe(($el) => $el.trigger('click'))
    .should('not.be.visible');
};

export const expandFirstAlert = () => {
  cy.get(EXPAND_ALERT_BTN).should('exist');

  cy.get(EXPAND_ALERT_BTN)
    .first()
    .pipe(($el) => $el.trigger('click'))
    .should('exist');
};

export const viewThreatIntelTab = () => cy.get(THREAT_INTEL_TAB).click();

export const viewThreatDetails = () => {
  cy.get(EXPAND_ALERT_BTN).first().click({ force: true });
};

export const setEnrichmentDates = (from?: string, to?: string) => {
  cy.get(ENRICHMENT_QUERY_RANGE_PICKER).within(() => {
    if (from) {
      cy.get(ENRICHMENT_QUERY_START_INPUT).first().type(`{selectall}${from}{enter}`);
    }
    if (to) {
      cy.get(ENRICHMENT_QUERY_END_INPUT).type(`{selectall}${to}{enter}`);
    }
  });
  cy.get(UPDATE_ENRICHMENT_RANGE_BUTTON).click();
};

export const goToClosedAlerts = () => {
  cy.get(CLOSED_ALERTS_FILTER_BTN).click();
  cy.get(REFRESH_BUTTON).should('not.have.text', 'Updating');
  cy.get(REFRESH_BUTTON).should('have.text', 'Refresh');
  cy.get(TIMELINE_COLUMN_SPINNER).should('not.exist');
};

export const goToManageAlertsDetectionRules = () => {
  cy.get(MANAGE_ALERT_DETECTION_RULES_BTN).should('exist').click({ force: true });
};

export const goToOpenedAlerts = () => {
  cy.get(OPENED_ALERTS_FILTER_BTN).click({ force: true });
  cy.get(REFRESH_BUTTON).should('not.have.text', 'Updating');
  cy.get(REFRESH_BUTTON).should('have.text', 'Refresh');
  cy.get(LOADING_INDICATOR).should('exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
};

export const openFirstAlert = () => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).first().click({ force: true });
  cy.get(OPEN_ALERT_BTN).click();
};

export const openAlerts = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click({ force: true });
  cy.get(OPEN_ALERT_BTN).click();
};

export const goToAcknowledgedAlerts = () => {
  cy.get(ACKNOWLEDGED_ALERTS_FILTER_BTN).click();
  cy.get(REFRESH_BUTTON).should('not.have.text', 'Updating');
  cy.get(REFRESH_BUTTON).should('have.text', 'Refresh');
  cy.get(TIMELINE_COLUMN_SPINNER).should('not.exist');
};

export const markAcknowledgedFirstAlert = () => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).first().click({ force: true });
  cy.get(MARK_ALERT_ACKNOWLEDGED_BTN).click();
};

export const markAcknowledgedAlerts = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click({ force: true });
  cy.get(MARK_SELECTED_ALERTS_ACKNOWLEDGED_BTN).click();
};

export const selectNumberOfAlerts = (numberOfAlerts: number) => {
  for (let i = 0; i < numberOfAlerts; i++) {
    cy.get(ALERT_CHECKBOX).eq(i).click({ force: true });
  }
};

export const sortRiskScore = () => {
  cy.get(ALERT_RISK_SCORE_HEADER).click();
  cy.get(TIMELINE_COLUMN_SPINNER).should('exist');
  cy.get(TIMELINE_COLUMN_SPINNER).should('not.exist');
};

export const investigateFirstAlertInTimeline = () => {
  cy.get(SEND_ALERT_TO_TIMELINE_BTN).first().click({ force: true });
};

export const waitForAlerts = () => {
  cy.get(REFRESH_BUTTON).should('not.have.text', 'Updating');
};

export const waitForAlertsIndexToBeCreated = () => {
  cy.request({
    url: '/api/detection_engine/index',
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status !== 200) {
      cy.request({
        method: 'POST',
        url: `/api/detection_engine/index`,
        headers: { 'kbn-xsrf': 'create-signals-index' },
      });
    }
  });
};

export const waitForAlertsPanelToBeLoaded = () => {
  cy.get(LOADING_ALERTS_PANEL).should('exist');
  cy.get(LOADING_ALERTS_PANEL).should('not.exist');
};

export const waitForAlertsToBeLoaded = () => {
  const expectedNumberOfDisplayedAlerts = 25;
  cy.get(SELECT_EVENT_CHECKBOX).should('have.length', expectedNumberOfDisplayedAlerts);
};
