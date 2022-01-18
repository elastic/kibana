/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const navigateToHostRiskDetailTab = () =>
  cy.get('[data-test-subj="navigation-hostRisk"]').click();

export const openRiskFlyout = () =>
  cy.get('[data-test-subj="open-risk-information-flyout-trigger"]').click();

export const waitForTableToLoad = () => {
  cy.get('.euiBasicTable-loading').should('exist');
  cy.get('.euiBasicTable-loading').should('not.exist');
};
