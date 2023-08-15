/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Home page with empty state', () => {
  beforeEach(() => {
    cy.loginAsElastic();
  });

  it('shows the empty state when Profiling has not been set up', () => {
    cy.intercept('GET', '/internal/profiling/setup/es_resources', {
      fixture: 'es_resources_setup_false.json',
    }).as('getEsResources');
    cy.visitKibana('/app/profiling');
    cy.wait('@getEsResources');
    cy.contains('Universal Profiling');
    cy.contains('Set up Universal Profiling');
  });

  it('shows the tutorial after Profiling has been set up', () => {
    cy.intercept('GET', '/internal/profiling/setup/es_resources', {
      fixture: 'es_resources_data_false.json',
    }).as('getEsResources');
    cy.visitKibana('/app/profiling');
    cy.wait('@getEsResources');
    cy.contains('Add profiling data');
    cy.contains('Kubernetes');
    cy.contains('Docker');
    cy.contains('Binary');
    cy.contains('DEB Package');
    cy.contains('RPM Package');
    cy.contains('Upload Symbols');
  });
});
