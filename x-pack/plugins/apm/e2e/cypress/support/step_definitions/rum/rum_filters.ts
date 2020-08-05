/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { When, Then } from 'cypress-cucumber-preprocessor/steps';
import { DEFAULT_TIMEOUT } from './rum_dashboard';

When(/^the user filters by "([^"]*)"$/, (filterName) => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');
  cy.get(`#local-filter-${filterName}`).click();

  if (filterName === 'os') {
    cy.get('button.euiSelectableListItem[title="Mac OS X"]', {
      timeout: DEFAULT_TIMEOUT,
    }).click();
  } else {
    cy.get('button.euiSelectableListItem[title="DE"]', {
      timeout: DEFAULT_TIMEOUT,
    }).click();
  }
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

  cy.get('[data-cy=clearFilters]').click();
});
