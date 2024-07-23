/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_INTEGRATION_POLICY_BTN,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
} from '../screens/integrations';
import { login } from '../tasks/login';
// import { cleanupAgentPolicies } from '../tasks/cleanup';
// import { deleteIntegrations } from '../tasks/integrations';

describe('Create Agentless policy', () => {
  beforeEach(() => {
    login();
  });

  afterEach(() => {
    // cleanupAgentPolicies();
    // deleteIntegrations();
  });

  it('should allow saving agent-based pollicy when agentless is available', () => {
    cy.intercept('POST', 'api/fleet/agent_policies?sys_monitoring=true', {
      item: {
        id: 'policy-id',
        name: `Agent policy 1`,
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        inactivity_timeout: 1209600,
        is_protected: false,
        status: 'active',
        revision: 1,
        updated_at: '2024-07-23T18:20:49.315Z',
        updated_by: 'elastic',
        schema_version: '1.1.1',
      },
      status: 200,
    }).as('createAgentPolicy');

    cy.visit('/app/integrations/detail/cloud_security_posture');

    cy.getBySel(ADD_INTEGRATION_POLICY_BTN).click();
    cy.getBySel('setup-technology-selector-accordion').click();
    cy.getBySel('setup-technology-selector').click();
    cy.get('.euiContextMenuItem').contains('Agent-based').click();
  });

  it('should allow saving agentless policy option when agentless is available', () => {
    const integrationName = `cloud_security_posture-${new Date().toISOString()}`;

    cy.intercept('POST', 'api/fleet/agent_policies?sys_monitoring=true', {
      item: {
        id: 'policy-id',
        name: `Agentless policy for ${integrationName}`,
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        inactivity_timeout: 1209600,
        is_protected: false,
        supports_agentless: true,
        status: 'active',
        is_managed: true,
        revision: 1,
        updated_at: '2024-07-23T18:20:49.315Z',
        updated_by: 'elastic',
        schema_version: '1.1.1',
      },
      status: 200,
    }).as('createAgentPolicy');
    cy.intercept('POST', '/api/fleet/package_policies', {
      item: {
        id: 'package-policy-id',
        name: integrationName,
        description: '',
        policy_ids: ['policy-id'],
        spaceId: 'default',
        inputs: [],
        revision: 1,
        enabled: true,
        updated_by: 'elastic',
        updated_at: '2024-07-23T18:20:49.315Z',
        created_at: '2024-07-23T18:20:49.315Z',
        created_by: 'elastic',
      },
    }).as('createPackagePolicies');
    cy.visit('/app/integrations/detail/cloud_security_posture?');

    cy.getBySel(ADD_INTEGRATION_POLICY_BTN).click();
    cy.getBySel('setup-technology-selector-accordion').click();
    cy.getBySel('setup-technology-selector').click();
    cy.get('.euiContextMenuItem').contains('Agentless').click();
    cy.get('#name').clear();
    cy.get('#name').type(integrationName);
    cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();

    cy.wait('@createAgentPolicy').then(({ request }) => {
      expect(request.body.name).to.eq(`Agentless policy for ${integrationName}`);
      expect(request.body.supports_agentless).to.eq(true);
      expect(request.body.namespace).to.eq('default');
    });

    cy.wait('@createPackagePolicies');
    cy.getBySel('confirmModalCancelButton').click();
  });
});
