/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps';
import { loginAndWaitForPage } from '../../integration/helpers';

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 60 * 1000;

Given(`a user browses the APM UI application for RUM Data`, () => {
  // open service overview page
  const RANGE_FROM = 'now-24h';
  const RANGE_TO = 'now';
  loginAndWaitForPage(`/app/apm#/services`, { from: RANGE_FROM, to: RANGE_TO });
});

When(`the user inspects the real user monitoring tab`, () => {
  // click rum tab
  cy.get(':contains(Real User Monitoring)', { timeout: DEFAULT_TIMEOUT })
    .last()
    .click({ force: true });
});

Then(`should redirect to rum dashboard`, () => {
  cy.url().should('contain', `/app/apm#/rum-overview`);
});

Then(`should have correct client metrics`, () => {
  const clientMetrics = '[data-cy=client-metrics] .euiStat__title';

  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');

  cy.get(clientMetrics).eq(2).invoke('text').snapshot();

  cy.get(clientMetrics).eq(1).invoke('text').snapshot();

  cy.get(clientMetrics).eq(0).invoke('text').snapshot();
});
