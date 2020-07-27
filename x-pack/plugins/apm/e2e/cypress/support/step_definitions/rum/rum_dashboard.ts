/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Given, Then } from 'cypress-cucumber-preprocessor/steps';
import { loginAndWaitForPage } from '../../../integration/helpers';

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 60 * 1000;

Given(`a user browses the APM UI application for RUM Data`, () => {
  // open service overview page
  const RANGE_FROM = 'now-24h';
  const RANGE_TO = 'now';
  loginAndWaitForPage(`/app/apm#/rum-preview`, {
    from: RANGE_FROM,
    to: RANGE_TO,
  });
});

Then(`should have correct client metrics`, () => {
  const clientMetrics = '[data-cy=client-metrics] .euiStat__title';

  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title', { timeout: DEFAULT_TIMEOUT }).should('be.visible');
  cy.get('.euiSelect-isLoading').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');

  cy.get(clientMetrics).eq(2).should('have.text', '55 ');

  cy.get(clientMetrics).eq(1).should('have.text', '0.08 sec');

  cy.get(clientMetrics).eq(0).should('have.text', '0.01 sec');
});

Then(`should display percentile for page load chart`, () => {
  const pMarkers = '[data-cy=percentile-markers] span';

  cy.get('.euiLoadingChart', { timeout: DEFAULT_TIMEOUT }).should('be.visible');

  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');

  cy.get(pMarkers).eq(0).should('have.text', '50th');

  cy.get(pMarkers).eq(1).should('have.text', '75th');

  cy.get(pMarkers).eq(2).should('have.text', '90th');

  cy.get(pMarkers).eq(3).should('have.text', '95th');
});

Then(`should display chart legend`, () => {
  const chartLegend = 'div.echLegendItem__label';

  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiLoadingChart').should('not.be.visible');

  cy.get(chartLegend, { timeout: DEFAULT_TIMEOUT })
    .eq(0)
    .invoke('text')
    .snapshot();
});

Then(`should display tooltip on hover`, () => {
  cy.get('.euiLoadingChart').should('not.be.visible');

  const pMarkers = '[data-cy=percentile-markers] span.euiToolTipAnchor';

  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiLoadingChart').should('not.be.visible');

  const marker = cy.get(pMarkers, { timeout: DEFAULT_TIMEOUT }).eq(0);
  marker.invoke('show');
  marker.trigger('mouseover', { force: true });
  cy.get('span[data-cy=percentileTooltipTitle]').should('be.visible');
});
