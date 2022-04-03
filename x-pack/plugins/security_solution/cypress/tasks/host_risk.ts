/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HOST_BY_RISK_TABLE_FILTER,
  HOST_BY_RISK_TABLE_FILTER_CRITICAL,
  HOST_BY_RISK_TABLE_PERPAGE_BUTTON,
  HOST_BY_RISK_TABLE_PERPAGE_OPTIONS,
  LOADING_SPINNER,
  LOADING_TABLE,
  RISK_DETAILS_NAV,
  RISK_FLYOUT_TRIGGER,
} from '../screens/hosts/host_risk';

export const navigateToHostRiskDetailTab = () => {
  cy.get(RISK_DETAILS_NAV).click();
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
};

export const openRiskFlyout = () => cy.get(RISK_FLYOUT_TRIGGER).click();

export const waitForTableToLoad = () => {
  cy.get(LOADING_TABLE).should('exist');
  cy.get(LOADING_TABLE).should('not.exist');
};

export const openRiskTableFilterAndSelectTheCriticalOption = () => {
  cy.get(HOST_BY_RISK_TABLE_FILTER).click();
  cy.get(HOST_BY_RISK_TABLE_FILTER_CRITICAL).click();
};
export const removeCritialFilter = () => {
  cy.get(HOST_BY_RISK_TABLE_FILTER_CRITICAL).click();
};
export const selectFiveItemsPerPageOption = () => {
  cy.get(HOST_BY_RISK_TABLE_PERPAGE_BUTTON).click();
  cy.get(HOST_BY_RISK_TABLE_PERPAGE_OPTIONS).first().click();
};
