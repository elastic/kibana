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
