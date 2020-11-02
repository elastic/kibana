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

  cy.get(`#local-filter-popover-${filterName}`, DEFAULT_TIMEOUT).within(() => {
    if (filterName === 'os') {
      const osItem = cy.get('li.euiSelectableListItem', DEFAULT_TIMEOUT).eq(2);
      osItem.should('have.text', 'Mac OS X8 ');
      osItem.click();

      // sometimes click doesn't work as expected so we need to retry here
      osItem.invoke('attr', 'aria-selected').then((val) => {
        if (val === 'false') {
          cy.get('li.euiSelectableListItem', DEFAULT_TIMEOUT).eq(2).click();
        }
      });
    } else {
      const deItem = cy.get('li.euiSelectableListItem', DEFAULT_TIMEOUT).eq(0);
      deItem.should('have.text', 'DE28 ');
      deItem.click();

      // sometimes click doesn't work as expected so we need to retry here
      deItem.invoke('attr', 'aria-selected').then((val) => {
        if (val === 'false') {
          cy.get('li.euiSelectableListItem', DEFAULT_TIMEOUT).eq(0).click();
        }
      });
    }
    cy.get('[data-cy=applyFilter]').click();
  });

  cy.get(`div#local-filter-values-${filterName}`, DEFAULT_TIMEOUT).within(
    () => {
      cy.get('span.euiBadge__content')
        .eq(0)
        .should('have.text', filterName === 'os' ? 'Mac OS X' : 'DE');
    }
  );
});

Then(/^it filters the client metrics "([^"]*)"$/, (filterName) => {
  // wait for all loading to finish
  cy.get('kbnLoadingIndicator').should('not.be.visible');
  cy.get('.euiStat__title-isLoading').should('not.be.visible');

  const data =
    filterName === 'os'
      ? ['82 ms', '5 ms', '77 ms', '8']
      : ['75 ms', '4 ms', '71 ms', '28'];

  verifyClientMetrics(data, true);

  cy.get('[data-cy=clearFilters]', DEFAULT_TIMEOUT).click();
});
