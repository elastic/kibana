/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps';
import { loginAndWaitForPage } from '../../integration/helpers';

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 60 * 1000;

Given(`a user browses the APM UI application`, () => {
  // open service overview page
  loginAndWaitForPage(`/app/apm#/services`, {
    from: '2020-06-01T14:59:32.686Z',
    to: '2020-06-16T16:59:36.219Z',
  });
});

When(`the user inspects the opbeans-node service`, () => {
  // click opbeans-node service
  cy.get(':contains(opbeans-node)', { timeout: DEFAULT_TIMEOUT })
    .last()
    .click({ force: true });
});

Then(`should redirect to correct path with correct params`, () => {
  cy.url().should('contain', `/app/apm#/services/opbeans-node/transactions`);
  cy.url().should('contain', `transactionType=request`);
});

Then(`should have correct y-axis ticks`, () => {
  const yAxisTick =
    '[data-cy=transaction-duration-charts] .rv-xy-plot__axis--vertical .rv-xy-plot__axis__tick__text';

  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');

  // literal assertions because snapshot() doesn't retry
  cy.get(yAxisTick).eq(2).should('have.text', '55 ms');
  cy.get(yAxisTick).eq(1).should('have.text', '28 ms');
  cy.get(yAxisTick).eq(0).should('have.text', '0 ms');
});
