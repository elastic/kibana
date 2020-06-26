/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps';

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 60 * 1000;

Given(`a user click the filter`, () => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');
  cy.get('#local-filter-os').click();
});

When(`the user select the filter`, () => {
  cy.get('button.euiSelectableListItem[title="Mac OS X"]').click();
});

Then(`user applies the selected filter`, () => {
  cy.get('[data-cy=applyFilter]').click();
});

Then(`it filters the client metrics`, () => {
  const clientMetrics = '[data-cy=client-metrics] .euiStat__title';

  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');

  cy.get(clientMetrics).eq(2).invoke('text').snapshot();

  cy.get(clientMetrics).eq(1).invoke('text').snapshot();

  cy.get(clientMetrics).eq(0).invoke('text').snapshot();
});
