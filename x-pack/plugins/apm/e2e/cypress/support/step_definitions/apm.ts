/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps';
import { loginAndWaitForPage } from '../../integration/helpers';

Given(`a user browses the APM UI application`, () => {
  // open service overview page
  loginAndWaitForPage(`/app/apm#/services`);
});

When(`the user inspects the opbeans-node service`, () => {
  // click opbeans-node service
  cy.get(':contains(opbeans-node)')
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

  cy.get(yAxisTick)
    .eq(2)
    .invoke('text')
    .snapshot();

  cy.get(yAxisTick)
    .eq(1)
    .invoke('text')
    .snapshot();

  cy.get(yAxisTick)
    .eq(0)
    .invoke('text')
    .snapshot();
});
