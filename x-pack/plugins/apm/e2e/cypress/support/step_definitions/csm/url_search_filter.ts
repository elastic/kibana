/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { When, Then } from 'cypress-cucumber-preprocessor/steps';
import { DEFAULT_TIMEOUT } from './csm_dashboard';
import { waitForLoadingToFinish } from './utils';

When(`a user clicks inside url search field`, () => {
  waitForLoadingToFinish();
  cy.get('.euiStat__title-isLoading').should('not.exist');
  cy.get('span[data-cy=csmUrlFilter]', DEFAULT_TIMEOUT).within(() => {
    cy.get('input.euiFieldSearch').click();
  });
});

Then(`it displays top pages in the suggestion popover`, () => {
  waitForLoadingToFinish();

  cy.get('div.euiPopover__panel-isOpen', DEFAULT_TIMEOUT).within(() => {
    const listOfUrls = cy.get('li.euiSelectableListItem');
    listOfUrls.should('have.length', 5);

    const actualUrlsText = [
      'http://opbeans-node:3000/dashboardTotal page views: 17Page load duration: 109 ms (median)',
      'http://opbeans-node:3000/ordersTotal page views: 14Page load duration: 72 ms (median)',
    ];

    cy.get('li.euiSelectableListItem')
      .eq(0)
      .should('have.text', actualUrlsText[0]);
    cy.get('li.euiSelectableListItem')
      .eq(1)
      .should('have.text', actualUrlsText[1]);
  });
});

When(`a user enters a query in url search field`, () => {
  waitForLoadingToFinish();

  cy.get('[data-cy=csmUrlFilter]').within(() => {
    cy.get('input.euiSelectableSearch').type('cus');
  });

  waitForLoadingToFinish();
});

Then(`it should filter results based on query`, () => {
  waitForLoadingToFinish();

  cy.get('div.euiPopover__panel-isOpen', DEFAULT_TIMEOUT).within(() => {
    const listOfUrls = cy.get('li.euiSelectableListItem');
    listOfUrls.should('have.length', 1);

    const actualUrlsText = [
      'http://opbeans-node:3000/customersTotal page views: 10Page load duration: 76 ms (median)',
    ];

    cy.get('li.euiSelectableListItem')
      .eq(0)
      .should('have.text', actualUrlsText[0]);
  });
});
