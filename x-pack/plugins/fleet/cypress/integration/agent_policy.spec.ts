/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Edit agent policy', () => {
  beforeEach(() => {
    cy.intercept('/api/fleet/agent_policies/policy-1', {
      item: {
        id: 'policy-1',
        name: 'Agent policy 1',
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        status: 'active',
      },
    });
    cy.intercept('/api/fleet/agent_status?policyId=policy-1', {
      results: {
        total: 0,
        inactive: 0,
        online: 0,
        error: 0,
        offline: 0,
        updating: 0,
        other: 0,
        events: 0,
      },
    });
  });

  it('should edit agent policy', () => {
    cy.visit('/app/fleet/policies/policy-1/settings');
    cy.getBySel('toastCloseButton').click();
    cy.get('[placeholder="Optional description"').clear().type('desc');

    cy.intercept('/api/fleet/agent_policies/policy-1', {
      item: {
        id: 'policy-1',
        name: 'Agent policy 1',
        description: 'desc',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        status: 'active',
      },
    });
    cy.intercept('PUT', '/api/fleet/agent_policies/policy-1', {
      name: 'Agent policy 1',
      description: 'desc',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
    }).as('updateAgentPolicy');
    cy.get('.euiButton').contains('Save changes').click();

    cy.wait('@updateAgentPolicy').then((interception) => {
      expect(interception.request.body.description).to.equal('desc');
    });
  });
});
