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

  ['apm', 'applications'].forEach((keyword) => {
    describe(`Deep links for ${keyword} keyword`, () => {
      it('contains all the expected deep links', () => {
        // navigates to home page
        cy.visitKibana('/');
        // Wait until the page content is fully loaded
        // otherwise, the search results may disappear before all checks are completed, making this test flaky
        cy.waitUntilPageContentIsLoaded();
        cy.getByTestSubj('nav-search-input').should('be.visible').type(keyword, { force: true });

        cy.contains('Applications');
        cy.contains('Applications / Service Inventory');
        cy.contains('Applications / Service groups');
        // scroll to the center & bottom because results are not rendering otherwise
        scrollToPositionResults('center');
        cy.contains('Applications / Traces');
        cy.contains('Applications / Service Map');
        scrollToPositionResults('bottom');
        cy.contains('Applications / Dependencies');
        cy.contains('Applications / Settings');
      });

      it('navigates to Service Inventory page', () => {
        cy.visitKibana('/');
        assertDeepLink(keyword, 'Applications / Service Inventory', '/apm/services');
      });

      it('navigates to Service groups page', () => {
        cy.visitKibana('/');
        assertDeepLink(keyword, 'Applications / Service groups', '/apm/service-groups');
      });

      it('navigates to Traces page', () => {
        cy.visitKibana('/');
        assertDeepLink(keyword, 'Applications / Traces', '/apm/traces', 'center');
      });

      it('navigates to Service Map page', () => {
        cy.visitKibana('/');
        assertDeepLink(keyword, 'Applications / Service Map', '/apm/service-map', 'center');
      });

      it('navigates to Dependencies page', () => {
        cy.visitKibana('/');
        assertDeepLink(
          keyword,
          'Applications / Dependencies',
          '/apm/dependencies/inventory',
          'bottom'
        );
      });

      it('navigates to Settings page', () => {
        cy.visitKibana('/');
        assertDeepLink(
          keyword,
          'Applications / Settings',
          '/apm/settings/general-settings',
          'bottom'
        );
      });
    });
  });
});

function assertDeepLink(
  keyword: string,
  title: string,
  url: string,
  scroll?: Cypress.PositionType
) {
  // Wait until the page content is fully loaded
  // otherwise, the search results may disappear before all checks are completed, making this test flaky
  cy.waitUntilPageContentIsLoaded();
  cy.getByTestSubj('nav-search-input').should('be.visible').type(keyword, { force: true });

  if (scroll) {
    scrollToPositionResults(scroll);
  }

  // Force click because welcome screen changes
  // https://github.com/elastic/kibana/pull/108193
  cy.contains(title).click({ force: true });
  cy.url().should('include', url);
}

function scrollToPositionResults(position: Cypress.PositionType) {
  // Make sure the search results are visible and we can scroll
  cy.getByTestSubj('euiSelectableList')
    .should('be.visible')
    .find('div > div')
    .should('have.length.greaterThan', 0)
    .scrollTo(position);
}
