/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { When, Then } from 'cypress-cucumber-preprocessor/steps';
import { DEFAULT_TIMEOUT } from './csm_dashboard';
import { verifyClientMetrics } from './client_metrics_helper';
import { waitForLoadingToFinish } from './utils';

When(/^the user filters by "([^"]*)"$/, (filterName) => {
  waitForLoadingToFinish();
  cy.get('.euiStat__title-isLoading').should('not.exist');

  cy.get(
    `button[aria-label="expands filter group for ${filterName} filter"]`
  ).click();

  cy.get(`.euiPopover__panel-isOpen`, DEFAULT_TIMEOUT).within(() => {
    if (filterName === 'OS') {
      const osItem = cy.get('li.euiSelectableListItem', DEFAULT_TIMEOUT).eq(2);
      osItem.should('have.text', 'Mac OS X24 ');
      osItem.click();

      // sometimes click doesn't work as expected so we need to retry here
      osItem.invoke('attr', 'aria-selected').then((val) => {
        if (val === 'false') {
          cy.get('li.euiSelectableListItem', DEFAULT_TIMEOUT).eq(2).click();
        }
      });
    } else {
      const deItem = cy.get('li.euiSelectableListItem', DEFAULT_TIMEOUT).eq(0);
      deItem.should('have.text', 'DE84 ');
      deItem.click();

      // sometimes click doesn't work as expected so we need to retry here
      deItem.invoke('attr', 'aria-selected').then((val) => {
        if (val === 'false') {
          cy.get('li.euiSelectableListItem', DEFAULT_TIMEOUT).eq(0).click();
        }
      });
    }
    cy.contains('Apply').click();
  });

  cy.get(`.globalFilterLabel__value`, DEFAULT_TIMEOUT).contains(
    filterName === 'OS' ? 'Mac OS X' : 'DE'
  );
});

Then(/^it filters the client metrics "([^"]*)"$/, (filterName) => {
  waitForLoadingToFinish();
  cy.get('.euiStat__title-isLoading').should('not.exist');

  const data =
    filterName === 'OS'
      ? ['82 ms', '5 ms', '77 ms', '8']
      : ['75 ms', '4 ms', '71 ms', '28'];

  verifyClientMetrics(data, true);

  cy.get('[data-cy=clearFilters]', DEFAULT_TIMEOUT).click();
});
