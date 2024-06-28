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

  it('shows Set up page when Profiling has not been set up', () => {
    cy.intercept('GET', '/internal/profiling/setup/es_resources', {
      body: {
        has_setup: false,
        has_data: false,
        pre_8_9_1_data: false,
      },
    }).as('getEsResources');
    cy.visitKibana('/app/profiling');
    cy.wait('@getEsResources');
    cy.contains('Universal Profiling');
    cy.contains('Set up Universal Profiling');
  });

  it('shows Add data page after Profiling has been set up', () => {
    cy.intercept('GET', '/internal/profiling/setup/es_resources', {
      body: {
        has_setup: true,
        has_data: false,
        pre_8_9_1_data: false,
      },
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

  describe('Delete Data View', () => {
    it('shows Delete page when setup is false', () => {
      cy.intercept('GET', '/internal/profiling/setup/es_resources', {
        body: {
          has_setup: false,
          has_data: true,
          pre_8_9_1_data: true,
        },
      }).as('getEsResources');
      cy.visitKibana('/app/profiling');
      cy.wait('@getEsResources');
      cy.contains('Delete existing profiling data');
    });

    it('shows Delete page when data pre 8.9.1 is still available and data is found', () => {
      cy.intercept('GET', '/internal/profiling/setup/es_resources', {
        body: {
          has_setup: true,
          has_data: true,
          pre_8_9_1_data: true,
        },
      }).as('getEsResources');
      cy.visitKibana('/app/profiling');
      cy.wait('@getEsResources');
      cy.contains('Delete existing profiling data');
    });

    it('shows Delete page when data pre 8.9.1 is still available and data is not found', () => {
      cy.intercept('GET', '/internal/profiling/setup/es_resources', {
        body: {
          has_setup: true,
          has_data: false,
          pre_8_9_1_data: true,
        },
      }).as('getEsResources');
      cy.visitKibana('/app/profiling');
      cy.wait('@getEsResources');
      cy.contains('Delete existing profiling data');
    });
  });

  it('shows disabled button for users without privileges', () => {
    cy.intercept('GET', '/internal/profiling/setup/es_resources', {
      body: {
        has_setup: false,
        has_data: false,
        pre_8_9_1_data: false,
        has_required_role: false,
      },
    }).as('getEsResources');
    cy.visitKibana('/app/profiling');
    cy.wait('@getEsResources');
    cy.contains('Set up Universal Profiling').should('be.disabled');
  });

  it('shows emabled button for users without privileges', () => {
    cy.intercept('GET', '/internal/profiling/setup/es_resources', {
      body: {
        has_setup: false,
        has_data: false,
        pre_8_9_1_data: false,
        has_required_role: true,
      },
    }).as('getEsResources');
    cy.visitKibana('/app/profiling');
    cy.wait('@getEsResources');
    cy.contains('Set up Universal Profiling').should('not.be.disabled');
  });
});
