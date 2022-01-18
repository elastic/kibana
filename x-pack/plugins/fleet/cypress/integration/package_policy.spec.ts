/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Edit package policy', () => {
  const policyConfig = {
    id: 'policy-1',
    name: 'fleet_server-1',
    namespace: 'default',
    package: { name: 'fleet_server', title: 'Fleet Server', version: '1.1.1' },
    enabled: true,
    policy_id: 'fleet-server-policy',
    output_id: 'fleet-default-output',
    inputs: [
      {
        type: 'fleet-server',
        policy_template: 'fleet_server',
        enabled: true,
        streams: [],
        vars: {
          host: { value: ['0.0.0.0'], type: 'text' },
          port: { value: [8220], type: 'integer' },
          max_connections: { type: 'integer' },
          custom: { value: '', type: 'yaml' },
        },
        compiled_input: { server: { port: 8220, host: '0.0.0.0' } },
      },
    ],
  };
  beforeEach(() => {
    cy.intercept('/api/fleet/package_policies/policy-1', {
      item: policyConfig,
    });
    cy.intercept('/api/fleet/agent_status?policyId=fleet-server-policy', {
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
    cy.intercept('POST', '/api/fleet/package_policies/upgrade/dryrun', [
      {
        name: 'fleet_server-1',
        diff: [policyConfig, policyConfig],
        hasErrors: false,
      },
    ]);
  });

  it('should edit package policy', () => {
    cy.visit('/app/fleet/policies/fleet-server-policy/edit-integration/policy-1');
    cy.getBySel('toastCloseButton').click();
    cy.getBySel('packagePolicyDescriptionInput').clear().type('desc');

    cy.intercept('PUT', '/api/fleet/package_policies/policy-1', {
      name: 'fleet_server-1',
      description: 'desc',
      namespace: 'default',
    }).as('updatePackagePolicy');
    cy.get('.euiButton').contains('Save integration').click();

    cy.wait('@updatePackagePolicy').then((interception) => {
      expect(interception.request.body.description).to.equal('desc');
    });
  });
});
