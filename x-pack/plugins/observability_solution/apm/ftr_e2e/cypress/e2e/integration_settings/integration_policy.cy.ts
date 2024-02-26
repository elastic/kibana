/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

    cy.loginAsEditorUser();
    cy.visitKibana(integrationsPath);

    // open integration policy form
    cy.getByTestSubj('integration-card:ui_link:apm').click();
    cy.contains('Elastic APM in Fleet').click();
    cy.contains('a', 'APM integration').click();
    cy.getByTestSubj('addIntegrationPolicyButton').click();
  });

  it('checks validators for required fields', () => {
    const requiredFields = policyFormFields.filter((field) => field.required);

    requiredFields.map((field) => {
      cy.getByTestSubj(field.selector).clear();
      cy.getByTestSubj('createPackagePolicySaveButton').should('be.disabled');
      cy.getByTestSubj(field.selector).type(field.value);
    });
  });

  it('should display Tail-based section on latest version', () => {
    cy.visitKibana('/app/fleet/integrations/apm/add-integration');
    cy.contains('Tail-based sampling').should('exist');
  });

  it('should hide Tail-based section for 8.0.0 apm package', () => {
    cy.visitKibana('/app/fleet/integrations/apm-8.0.0/add-integration');
    cy.contains('Tail-based sampling').should('not.exist');
  });

  it('should Display Debug section', () => {
    cy.visitKibana('/app/fleet/integrations/apm-8.0.0/add-integration');
    cy.contains('Debug settings').should('exist');
  });
});
