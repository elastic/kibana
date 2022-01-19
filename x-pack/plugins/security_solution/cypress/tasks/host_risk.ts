/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOADING_TABLE, RISK_DETAILS_NAV, RISK_FLYOUT_TRIGGER } from '../screens/hosts/host_risk';

export const navigateToHostRiskDetailTab = () => cy.get(RISK_DETAILS_NAV).click();

export const openRiskFlyout = () => cy.get(RISK_FLYOUT_TRIGGER).click();

export const waitForTableToLoad = () => {
  cy.get(LOADING_TABLE).should('exist');
  cy.get(LOADING_TABLE).should('not.exist');
};
