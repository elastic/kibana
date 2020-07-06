/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps';

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 60 * 1000;

Given(`a user click page load breakdown filter`, () => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');
  const breakDownBtn = cy.get('[data-cy=breakdown-popover_pageLoad]');
  breakDownBtn.click();
});

When(`the user selected the breakdown`, () => {
  cy.get('[data-cy=filter-breakdown-item_Browser]', {
    timeout: DEFAULT_TIMEOUT,
  }).click();
  // click outside popover to close it
  cy.get('[data-cy=pageLoadDist]').click();
});

Then(`breakdown series should appear in chart`, () => {
  cy.get('.euiLoadingChart').should('not.be.visible');
  cy.get('div.echLegendItem__label[title=Chrome] ')
    .invoke('text')
    .should('eq', 'Chrome');
});
