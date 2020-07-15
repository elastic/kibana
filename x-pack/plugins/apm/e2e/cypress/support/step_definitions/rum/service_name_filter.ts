/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { When, Then } from 'cypress-cucumber-preprocessor/steps';
import { DEFAULT_TIMEOUT } from '../apm';

When('a user changes the selected service name', (filterName) => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get(`[data-cy=serviceNameFilter]`, { timeout: DEFAULT_TIMEOUT }).select(
    'opbean-client-rum'
  );
});

Then(`it displays relevant client metrics`, () => {
  const clientMetrics = '[data-cy=client-metrics] .euiStat__title';

  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');

  cy.get(clientMetrics).eq(2).should('have.text', '7 ');

  cy.get(clientMetrics).eq(1).should('have.text', '0.07 sec');

  cy.get(clientMetrics).eq(0).should('have.text', '0.01 sec');
});
