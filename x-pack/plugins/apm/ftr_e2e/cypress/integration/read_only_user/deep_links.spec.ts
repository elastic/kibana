/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('APM depp links', () => {
  before(() => {
    cy.loginAsReadOnlyUser();
  });
  it('navigates to apm links on search elastic', () => {
    cy.visit('/');
    cy.get('[data-test-subj="nav-search-input"]').type('APM');
    cy.contains('APM');
    cy.contains('APM / Services');
    cy.contains('APM / Traces');
    cy.contains('APM / Service Map');

    // navigates to home page
    cy.contains('APM').click();
    cy.url().should('include', '/apm/services');

    cy.get('[data-test-subj="nav-search-input"]').type('APM');
    // navigates to services page
    cy.contains('APM / Services').click();
    cy.url().should('include', '/apm/services');

    cy.get('[data-test-subj="nav-search-input"]').type('APM');
    // navigates to traces page
    cy.contains('APM / Traces').click();
    cy.url().should('include', '/apm/traces');

    cy.get('[data-test-subj="nav-search-input"]').type('APM');
    // navigates to service maps
    cy.contains('APM / Service Map').click();
    cy.url().should('include', '/apm/service-map');
  });
});
