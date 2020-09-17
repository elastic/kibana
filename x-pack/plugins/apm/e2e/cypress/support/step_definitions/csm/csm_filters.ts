/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { When, Then } from 'cypress-cucumber-preprocessor/steps';
import { DEFAULT_TIMEOUT } from './csm_dashboard';
import { verifyClientMetrics } from './client_metrics_helper';

When(/^the user filters by "([^"]*)"$/, (filterName) => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');
  cy.get(`#local-filter-${filterName}`).click();

  if (filterName === 'os') {
    cy.get('span.euiSelectableListItem__text', DEFAULT_TIMEOUT)
      .contains('Mac OS X')
      .click();
  } else {
    cy.get('span.euiSelectableListItem__text', DEFAULT_TIMEOUT)
      .contains('DE')
      .click();
  }
  cy.get('[data-cy=applyFilter]').click();
});

Then(/^it filters the client metrics "([^"]*)"$/, (filterName) => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');

  const data =
    filterName === 'os' ? ['4 ms', '0.05 s', '9 '] : ['4 ms', '0.05 s', '15 '];

  verifyClientMetrics(data, true);

  cy.get('[data-cy=clearFilters]', DEFAULT_TIMEOUT).click();
});
