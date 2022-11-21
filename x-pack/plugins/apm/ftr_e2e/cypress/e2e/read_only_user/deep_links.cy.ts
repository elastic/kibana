/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('APM deep links', () => {
  beforeEach(() => {
    cy.loginAsViewerUser();
  });
  it('navigates to apm links on search elastic', () => {
    cy.visitKibana('/');
    cy.getByTestSubj('nav-search-input').type('APM');
    cy.contains('APM');
    cy.contains('APM / Services');
    cy.contains('APM / Service groups');
    cy.contains('APM / Traces');
    cy.contains('APM / Service Map');

    // navigates to home page
    // Force click because welcome screen changes
    // https://github.com/elastic/kibana/pull/108193
    cy.contains('APM').click({ force: true });
    cy.url().should('include', '/apm/services');

    cy.getByTestSubj('nav-search-input').type('APM');
    // navigates to services page
    cy.contains('APM / Services').click({ force: true });
    cy.url().should('include', '/apm/services');

    cy.getByTestSubj('nav-search-input').type('APM');
    // navigates to service groups page
    cy.contains('APM / Service groups').click({ force: true });
    cy.url().should('include', '/apm/service-groups');

    cy.getByTestSubj('nav-search-input').type('APM');
    // navigates to traces page
    cy.contains('APM / Traces').click({ force: true });
    cy.url().should('include', '/apm/traces');

    cy.getByTestSubj('nav-search-input').type('APM');
    // navigates to service maps
    cy.contains('APM / Service Map').click({ force: true });
    cy.url().should('include', '/apm/service-map');
  });
});
