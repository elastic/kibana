/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Home page', () => {
  const rangeFrom = '2023-04-18T00:00:00.000Z';
  const rangeTo = '2023-04-18T00:05:00.000Z';

  beforeEach(() => {
    cy.loginAsElastic();
  });

  it('opens Profiling UI when user does not have privileges', () => {
    cy.intercept('GET', '/internal/profiling/setup/es_resources', {
      body: {
        has_setup: true,
        pre_8_9_1_data: false,
        has_data: true,
        unauthorized: true,
      },
    }).as('getEsResources');
    cy.visitKibana('/app/profiling', { rangeFrom, rangeTo });
    cy.wait('@getEsResources');
    cy.contains('Top 46');
    cy.contains('User privilege limitation');
  });

  it('navigates through the tabs', () => {
    cy.visitKibana('/app/profiling', { rangeFrom, rangeTo });
    cy.url().should('include', '/app/profiling/stacktraces/threads');
    cy.get('[role="tablist"]').within(() => {
      cy.contains('Traces').click();
      cy.url().should('include', '/app/profiling/stacktraces/traces');
      cy.contains('Hosts').click();
      cy.url().should('include', '/app/profiling/stacktraces/hosts');
      cy.contains('Deployments').click();
      cy.url().should('include', '/app/profiling/stacktraces/deployments');
      cy.contains('Containers').click();
      cy.url().should('include', '/app/profiling/stacktraces/containers');
    });
  });
});
