/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Given, Then } from 'cypress-cucumber-preprocessor/steps';
import { loginAndWaitForPage } from '../../../integration/helpers';
import { verifyClientMetrics } from './client_metrics_helper';
import { waitForLoadingToFinish } from './utils';

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = { timeout: 60 * 1000 };

Given(`a user browses the APM UI application for RUM Data`, () => {
  // Open UX landing page
  const RANGE_FROM = 'now-24h';
  const RANGE_TO = 'now';
  loginAndWaitForPage(
    `/app/ux`,
    {
      from: RANGE_FROM,
      to: RANGE_TO,
    },
    'client'
  );
});

Then(`should have correct client metrics`, () => {
  const metrics = ['80 ms', '4 ms', '76 ms', '55'];

  verifyClientMetrics(metrics, true);
});

Then(`should display percentile for page load chart`, () => {
  const pMarkers = '[data-cy=percentile-markers] span';

  cy.get('.euiLoadingChart', DEFAULT_TIMEOUT).should('be.visible');

  waitForLoadingToFinish();

  cy.get('.euiStat__title-isLoading').should('not.exist');

  cy.get(pMarkers).eq(0).should('have.text', '50th');

  cy.get(pMarkers).eq(1).should('have.text', '75th');

  cy.get(pMarkers).eq(2).should('have.text', '90th');

  cy.get(pMarkers).eq(3).should('have.text', '95th');
});

Then(`should display chart legend`, () => {
  const chartLegend = 'button.echLegendItem__label';

  waitForLoadingToFinish();
  cy.get('.euiLoadingChart').should('not.exist');

  cy.get('[data-cy=pageLoadDist]').within(() => {
    cy.get(chartLegend, DEFAULT_TIMEOUT).eq(0).should('have.text', 'Overall');
  });
});

Then(`should display tooltip on hover`, () => {
  cy.get('.euiLoadingChart').should('not.exist');

  const pMarkers = '[data-cy=percentile-markers] span.euiToolTipAnchor';

  waitForLoadingToFinish();
  cy.get('.euiLoadingChart').should('not.exist');

  const marker = cy.get(pMarkers, DEFAULT_TIMEOUT).eq(0);
  marker.invoke('show');
  marker.trigger('mouseover', { force: true });
  cy.get('span[data-cy=percentileTooltipTitle]').should('be.visible');
});
