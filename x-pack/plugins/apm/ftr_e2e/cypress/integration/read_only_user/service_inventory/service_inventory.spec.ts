/*
 * copyright elasticsearch b.v. and/or licensed to elasticsearch b.v. under one
 * or more contributor license agreements. licensed under the elastic license
 * 2.0; you may not use this file except in compliance with the elastic license
 * 2.0.
 */

// service_inventory.spec.ts created with Cypress
//
// Start writing your Cypress tests below!
// If you're unfamiliar with how Cypress works,
// check out the link below and learn how to write your first test:
// https://on.cypress.io/writing-first-test

import url from 'url';

const start = '2021-01-01T00:00:00.000Z';
const from = new Date(start).getTime();
const end = '2021-01-01T00:15:00.000Z';
const to = new Date(end).getTime();

const serviceInventoryPath = '/app/apm/services';
const baseUrl = url.format({
  pathname: serviceInventoryPath,
  query: { rangeFrom: start, rangeTo: end },
});

describe('Service Inventory', () => {
  before(() => {
    cy.task('getConfigEnv').then((envStr: any) => {
      cy.log(envStr);
    });
    // const envStr =
    //   '{ ' +
    //   Object.entries(env)
    //     .map(([key, value]) => `${key}: ${value}`)
    //     .join(', ') +
    //   ' }';
    // cy.log(envStr);
  });
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
    cy.task('synthtrace:index:service_inventory', { from, to });
  });
  afterEach(() => {
    cy.task('synthtrace:clean');
  });
  /*when navigating to the service inventory
  - [ ] services are listed
  - [ ] environments are listed
  - [ ] an API request to /internal/apm/services is made
  - [ ] an API request to /internal/apm/services/detailed_statistics is made
  and selecting a different environment
  - [ ] an API request to /internal/apm/services is made with the selected environment
  - [ ] an API request to /internal/apm/services/detailed_statistics is made with the selected environment
  and clicking the refresh button
  - [ ] an API request to /internal/apm/services is made with the updated time range
  - [ ] an API request to /internal/apm/services/detailed_statistics is made with the updated time range
  and selecting a different time range
  - [ ] an API request to /internal/apm/services is made with the updated time range
  - [ ] an API request to /internal/apm/services/detailed_statistics is made with the updated time range
    and clicking the refresh button
      - [ ] an API request to /internal/apm/services is made with the updated time range
      - [ ] an API request to /internal/apm/services/detailed_statistics is made with the updated time range
  and selecting a different comparison window
  - [ ] an API request to /internal/apm/services/detailed_statistics is made with the updated comparison time range
  and clicking on a service
  - [ ] the application loads the service overview for that service*/

  it('persists transaction type selected when clicking on Transactions tab', () => {
    cy.visit(baseUrl);
    cy.get('tr.euiTableRow').should('have.lengthOf', 2);
  });

  // it('persists transaction type selected when clicking on Transactions tab', () => {
  //   cy.visit(baseUrl);
  //   cy.get('[data-test-subj="headerFilterTransactionType"]').should(
  //     'have.value',
  //     'request'
  //   );
  //   cy.get('[data-test-subj="headerFilterTransactionType"]').select('Worker');
  //   cy.get('[data-test-subj="headerFilterTransactionType"]').should(
  //     'have.value',
  //     'Worker'
  //   );
  //   cy.contains('Transactions').click();
  //   cy.get('[data-test-subj="headerFilterTransactionType"]').should(
  //     'have.value',
  //     'Worker'
  //   );
  // });
});
