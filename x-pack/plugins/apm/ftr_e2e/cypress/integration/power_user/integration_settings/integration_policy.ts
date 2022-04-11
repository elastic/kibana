/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const integrationsPoliciesPath = '/app/integrations/detail/apm/policies';
const policyName = 'apm-integration';
const description = 'integration description';
const host = 'myhost:8200';
const url = 'http://myhost:8200';

describe('when navigating to integration page', () => {
  beforeEach(() => {
    const integrationsPath = '/app/integrations/browse';

    cy.loginAsPowerUser();
    cy.visit(integrationsPath);
  });

  describe('creating a new integration policy', () => {
    beforeEach(() => {
      cy.get('[data-test-subj="integration-card:epr:apm:featured').click();
      cy.get('[aria-selected="true"]').contains('Elastic APM in Fleet');
      cy.contains('Elastic APM now available in Fleet!');
      cy.contains('a', 'APM integration').click();
      cy.url().should('include', 'app/integrations/detail/apm/overview');
      cy.get('[data-test-subj="addIntegrationPolicyButton"]')
        .should('not.disabled')
        .click();

      cy.get('[data-test-subj="packagePolicyDescriptionInput')
        .clear()
        .type(description);
      cy.get('[data-test-subj="packagePolicyNameInput')
        .clear()
        .type(policyName);
      cy.get('[data-test-subj="packagePolicyHostInput').clear().type(host);
      cy.get('[data-test-subj="packagePolicyUrlInput').clear().type(url);
    });

    it('checks validators for required fields', () => {
      cy.get('[data-test-subj="packagePolicyNameInput').clear();
      cy.get('[data-test-subj="createPackagePolicySaveButton"').should(
        'be.disabled'
      );

      cy.get('[data-test-subj="packagePolicyHostInput').clear();
      cy.get('[data-test-subj="createPackagePolicySaveButton"').should(
        'be.disabled'
      );
      cy.get('[data-test-subj="packagePolicyUrlInput').clear();
      cy.get('[data-test-subj="createPackagePolicySaveButton"').should(
        'be.disabled'
      );
    });

    it('adds a new policy without agent', () => {
      cy.contains('Save and continue').click();
      cy.get('[data-test-subj="confirmModalCancelButton').click();
      cy.url().should('include', '/app/integrations/detail/apm/policies');
      cy.contains(policyName);
    });
  });

  describe('updating an existing integration policy', () => {
    it('updates an existing policy', () => {
      const policiesPath = '/app/integrations/detail/apm/policies';
      cy.visit(policiesPath);
      cy.contains(policyName).click();

      cy.get('[data-test-subj="packagePolicyDescriptionInput')
        .clear()
        .type(`${description}-updated`);
      cy.get('[data-test-subj="packagePolicyNameInput')
        .clear()
        .type(`${policyName}-updated`);
      cy.get('[data-test-subj="packagePolicyHostInput')
        .clear()
        .type(`${host}-updated`);
      cy.get('[data-test-subj="packagePolicyUrlInput')
        .clear()
        .type(`${url}-updated`);

      cy.contains('Save integration').click();
      cy.contains(`${policyName}-updated`);
    });
  });

  describe('checking Tail-based section based on apm version', () => {
    it('should display Tail-based section on latest version', () => {
      cy.visit('/app/fleet/integrations/apm/add-integration');
      cy.contains('Tail-based sampling').should('exist');
    });

    it('should hide Tail-based section for 8.0.0 apm package', () => {
      cy.visit('/app/fleet/integrations/apm-8.0.0/add-integration');
      cy.contains('Tail-based sampling').should('not.exist');
    });
  });
});
