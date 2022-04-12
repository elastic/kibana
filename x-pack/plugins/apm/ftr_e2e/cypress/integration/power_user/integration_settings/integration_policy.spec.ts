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

const policyFormFields = [
  {
    selector: 'packagePolicyNameInput',
    value: 'apm-integration',
    required: true,
  },
  {
    selector: 'packagePolicyDescriptionInput',
    value: 'apm policy descrtiption',
    required: false,
  },
  {
    selector: 'packagePolicyHostInput',
    value: 'myhost:8200',
    required: true,
  },
  {
    selector: 'packagePolicyUrlInput',
    value: 'http://myhost:8200',
    required: true,
  },
];

describe('when navigating to integration page', () => {
  beforeEach(() => {
    const integrationsPath = '/app/integrations/browse';

    cy.loginAsPowerUser();
    cy.visit(integrationsPath);

    cy.get('[data-test-subj="integration-card:epr:apm:featured').click();
    cy.get('[aria-selected="true"]').contains('Elastic APM in Fleet');
    cy.contains('Elastic APM now available in Fleet!');
    cy.contains('a', 'APM integration').click();
    cy.url().should('include', 'app/integrations/detail/apm/overview');
    cy.get('[data-test-subj="addIntegrationPolicyButton"]')
      .should('not.disabled')
      .click();
  });

  it('checks validators for required fields', () => {
    const requiredFields = policyFormFields.filter((field) => field.required);

    requiredFields.map((field) => {
      cy.get(`[data-test-subj="${field.selector}"`).clear();
      cy.get('[data-test-subj="createPackagePolicySaveButton"').should(
        'be.disabled'
      );
      cy.get(`[data-test-subj="${field.selector}"`).type(field.value);
    });
  });

  it('adds a new policy without agent', () => {
    policyFormFields.map((field) => {
      cy.get(`[data-test-subj="${field.selector}"`).clear().type(field.value);
    });
    cy.contains('Save and continue').click();
    cy.get('[data-test-subj="confirmModalCancelButton').click();
    cy.url().should('include', '/app/integrations/detail/apm/policies');
    cy.contains(policyName);
  });

  it('updates an existing policy', () => {
    policyFormFields.map((field) => {
      cy.get(`[data-test-subj="${field.selector}"`)
        .clear()
        .type(`${field.value}-new`);
    });

    cy.contains('Save and continue').click();
    cy.get('[data-test-subj="confirmModalCancelButton').click();
    cy.contains(`${policyName}-new`).click();

    policyFormFields.map((field) => {
      cy.get(`[data-test-subj="${field.selector}"`)
        .clear()
        .type(`${field.value}-updated`);
    });
    cy.contains('Save integration').click();
    cy.contains(`${policyName}-updated`);
  });

  it('should display Tail-based section on latest version', () => {
    cy.visit('/app/fleet/integrations/apm/add-integration');
    cy.contains('Tail-based sampling').should('exist');
  });

  it('should hide Tail-based section for 8.0.0 apm package', () => {
    cy.visit('/app/fleet/integrations/apm-8.0.0/add-integration');
    cy.contains('Tail-based sampling').should('not.exist');
  });
});
