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
    package: { name: 'fleet_server', title: 'Fleet Server', version: '1.1.0' },
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
    cy.intercept('/api/fleet/agent_policies/fleet-server-policy', {
      item: {
        id: 'fleet-server-policy',
        name: 'Fleet server policy 1',
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        status: 'active',
        package_policies: [{ id: 'policy-1', name: 'fleet_server-1' }],
      },
    });
    cy.intercept('/api/fleet/epm/packages/fleet_server*', {
      item: {
        name: 'fleet_server',
        title: 'Fleet Server',
        version: '1.1.0',
        release: 'ga',
        description: 'Centrally manage Elastic Agents with the Fleet Server integration',
        type: 'integration',
        download: '/epr/fleet_server/fleet_server-1.1.0.zip',
        path: '/package/fleet_server/1.1.0',
        icons: [],
        conditions: { kibana: { version: '^7.16.0 || ^8.0.0' } },
        owner: { github: 'elastic/ingest-management' },
        categories: ['elastic_stack'],
        format_version: '1.0.0',
        readme: '/package/fleet_server/1.1.0/docs/README.md',
        license: 'basic',
        assets: {},
        policy_templates: [
          {
            name: 'fleet_server',
            title: 'Fleet Server',
            description: 'Fleet Server setup',
            inputs: [
              {
                type: 'fleet-server',
                vars: [],
                title: 'Fleet Server',
                description: 'Fleet Server Configuration',
                template_path: 'agent.yml.hbs',
              },
            ],
            multiple: true,
          },
        ],
        latestVersion: '1.1.0',
        removable: true,
        keepPoliciesUpToDate: false,
        status: 'not_installed',
      },
    });
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
