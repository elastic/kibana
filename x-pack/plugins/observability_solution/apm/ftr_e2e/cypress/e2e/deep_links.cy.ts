/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Applications deep links', () => {
  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  it('navigates to Application links on "application" search', () => {
    cy.visitKibana('/');
    navigatesToApmLinks('applications');
  });

  it('navigates to Application links on "apm" search', () => {
    cy.visitKibana('/');
    navigatesToApmLinks('apm');
  });

  function navigatesToApmLinks(keyword: string) {
    // Wait until the page content is fully loaded
    // otherwise, the search results may disappear before all checks are completed, making this test flaky
    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input')
      .should('be.visible')
      .type(keyword, { force: true })
      .focus();
    cy.contains('Applications');
    cy.contains('Applications / Service Inventory');
    cy.contains('Applications / Service groups');
    cy.contains('Applications / Traces');
    cy.contains('Applications / Service Map');
    // scroll to the bottom because results are not rendering otherwise
    scrollToBottomResults();
    cy.contains('Applications / Dependencies');
    cy.contains('Applications / Settings');

    // navigates to home page
    // Force click because welcome screen changes
    // https://github.com/elastic/kibana/pull/108193
    cy.contains('Applications').click({ force: true });
    cy.url().should('include', '/apm/services');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type(keyword, { force: true });
    // navigates to services page
    cy.contains('Applications / Service Inventory').click({ force: true });
    cy.url().should('include', '/apm/services');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type(keyword, { force: true });
    // navigates to service groups page
    cy.contains('Applications / Service groups').click({ force: true });
    cy.url().should('include', '/apm/service-groups');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type(keyword, { force: true });
    // navigates to traces page
    cy.contains('Applications / Traces').click({ force: true });
    cy.url().should('include', '/apm/traces');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type(keyword, { force: true });
    scrollToBottomResults();
    // navigates to service maps
    cy.contains('Applications / Service Map').click({ force: true });
    cy.url().should('include', '/apm/service-map');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type(keyword, { force: true });
    // scroll to the bottom because results are not rendering otherwise
    scrollToBottomResults();
    // navigates to dependencies page
    cy.contains('Applications / Dependencies').click({ force: true });
    cy.url().should('include', '/apm/dependencies/inventory');

    cy.waitUntilPageContentIsLoaded();
    cy.getByTestSubj('nav-search-input').should('be.visible').type(keyword, { force: true });
    // scroll to the bottom because results are not rendering otherwise
    scrollToBottomResults();
    // navigates to settings page
    cy.contains('Applications / Settings').click({ force: true });
    cy.url().should('include', '/apm/settings/general-settings');
  }
});

function scrollToBottomResults() {
  cy.getByTestSubj('euiSelectableList').find('div > div').scrollTo('bottom');
}
