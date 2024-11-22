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
    // Wait until the page content is fully loaded
    // otherwise, the search results may disappear before all checks are completed, making this test flaky
    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type('APM', { force: true }).focus();
    cy.contains('APM');
    cy.contains('APM / Service Inventory');
    cy.contains('APM / Service groups');
    cy.contains('APM / Traces');
    cy.contains('APM / Service Map');
    cy.contains('APM / Dependencies');
    cy.contains('APM / Settings');

    // navigates to home page
    // Force click because welcome screen changes
    // https://github.com/elastic/kibana/pull/108193
    cy.contains('APM').click({ force: true });
    cy.url().should('include', '/apm/services');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type('APM', { force: true });
    // navigates to services page
    cy.contains('APM / Service Inventory').click({ force: true });
    cy.url().should('include', '/apm/services');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type('APM', { force: true });
    // navigates to service groups page
    cy.contains('APM / Service groups').click({ force: true });
    cy.url().should('include', '/apm/service-groups');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type('APM', { force: true });
    // navigates to traces page
    cy.contains('APM / Traces').click({ force: true });
    cy.url().should('include', '/apm/traces');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type('APM', { force: true });
    // navigates to service maps
    cy.contains('APM / Service Map').click({ force: true });
    cy.url().should('include', '/apm/service-map');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type('APM', { force: true });
    // navigates to dependencies page
    cy.contains('APM / Dependencies').click({ force: true });
    cy.url().should('include', '/apm/dependencies/inventory');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type('APM', { force: true });
    // navigates to settings page
    cy.contains('APM / Settings').click({ force: true });
    cy.url().should('include', '/apm/settings/general-settings');
  });
});
