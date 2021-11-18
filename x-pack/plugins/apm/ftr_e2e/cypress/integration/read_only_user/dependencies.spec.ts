/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const timeRange = {
  rangeFrom: Cypress.env('START_DATE'),
  rangeTo: Cypress.env('END_DATE'),
};

describe('Dependencies', () => {
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  describe('top-level dependencies page', () => {
    it('has a list of dependencies and you can navigate to the page for one', () => {
      cy.visit(`/app/apm/services?${new URLSearchParams(timeRange)}`);
      cy.contains('nav a', 'Dependencies').click();

      // `force: true` because Cypress says the element is 0x0
      cy.contains('postgresql').click({ force: true });

      cy.contains('h1', 'postgresql');
    });
  });

  describe('dependency overview page', () => {
    it('shows dependency information and you can navigate to a page for an upstream service', () => {
      cy.visit(
        `/app/apm/backends/overview?${new URLSearchParams({
          ...timeRange,
          backendName: 'postgresql',
        })}`
      );

      cy.get('[data-test-subj="latencyChart"]');
      cy.get('[data-test-subj="throughputChart"]');
      cy.get('[data-test-subj="errorRateChart"]');

      cy.contains('opbeans-python').click({ force: true });

      cy.contains('h1', 'opbeans-python');
    });
  });

  describe('service overview page', () => {
    it('shows dependency information and you can navigate to a page for a dependency', () => {
      cy.visit(
        `/app/apm/services/opbeans-python/overview?${new URLSearchParams(
          timeRange
        )}`
      );

      cy.contains('postgresql').click({ force: true });

      cy.contains('h1', 'postgresql');
    });
  });

  describe('service dependencies tab', () => {
    it('shows dependency information and you can navigate to a page for a dependency', () => {
      cy.visit(
        `/app/apm/services/opbeans-python/overview?${new URLSearchParams(
          timeRange
        )}`
      );

      cy.contains('a[role="tab"]', 'Dependencies').click();

      cy.contains('Time spent by dependency');

      cy.contains('postgresql').click({ force: true });

      cy.contains('h1', 'postgresql');
    });
  });
});
