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
  // Open service inventory page
  loginAndWaitForPage(`/app/apm/services`, {
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
  cy.url().should('contain', `/app/apm/services/opbeans-node/transactions`);
  cy.url().should('contain', `transactionType=request`);
});
