/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMEOUT } from './csm_dashboard';

/**
 * Verifies the behavior of the client metrics component
 * @param metrics array of three elements
 * @param checkTitleStatus if it's needed to check title elements
 */
export function verifyClientMetrics(
  metrics: string[],
  checkTitleStatus: boolean
) {
  const clientMetricsSelector = '[data-cy=client-metrics] .euiStat__title';

  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');

  if (checkTitleStatus) {
    cy.get('.euiStat__title', DEFAULT_TIMEOUT).should('be.visible');
    cy.get('.euiSelect-isLoading').should('not.be.visible');
  }

  cy.get('.euiStat__title-isLoading').should('not.be.visible');

  cy.get(clientMetricsSelector).eq(0).should('have.text', metrics[0]);

  cy.get(clientMetricsSelector).eq(1).should('have.text', metrics[1]);

  cy.get(clientMetricsSelector).eq(2).should('have.text', metrics[2]);
}
