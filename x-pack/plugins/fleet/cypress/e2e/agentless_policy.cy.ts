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
import { cleanupAgentPolicies } from '../tasks/cleanup';
import { login } from '../tasks/login';
import { deleteIntegrations } from '../tasks/integrations';

describe('Create Agentless policy', () => {
  const agentlessIntegration = 'cloud_security_posture-1.9.0';

  beforeEach(() => {
    login();
    cy.intercept('POST', '/api/fleet/agent_policies?sys_monitoring=true', {
      id: 'policy-id',
      name: agentlessIntegration,
      namespace: 'default',
      monitoring_enabled: true,
      supports_agentless: true,
      is_managed: false,
      revision: 1,
      package_policies: [],
      policy_ids: ['policy-id'],
      agents: ['agent-id'],
    });
    // cy.intercept('/api/fleet/agent_policies', {
    //   items: [
    //     {
    //       id: 'fleet-default-settings',
    //       name: 'Host',
    //       host_urls: ['https://localhost:8220'],
    //       is_default: true,
    //     },
    //     {
    //       id: 'fleet-internal-host',
    //       name: 'Internal Host',
    //       host_urls: ['https://internal:8220'],
    //       is_default: false,
    //       is_internal: true,
    //     },
    //   ],
    //   page: 1,
    //   perPage: 10000,
    //   total: 0,
    // });

    // cy.intercept('/api/fleet/outputs', {
    //   items: [
    //     {
    //       id: 'fleet-default-output',
    //       name: 'default',
    //       type: 'elasticsearch',
    //       is_default: true,
    //       is_default_monitoring: true,
    //     },
    //   ],
    // });

    // cleanupAgentPolicies();
    // deleteIntegrations();
  });

  afterEach(() => {});

  //   it('should allow selecting agent-based option when agentless is available', () => {
  //     cy.visit('/app/integrations/detail/cloud_security_posture');

  //     cy.getBySel(ADD_INTEGRATION_POLICY_BTN).click();
  //     cy.getBySel('setup-technology-selector-accordion').click();
  //     cy.getBySel('setup-technology-selector').click();
  //     cy.get('.euiContextMenuItem').contains('Agent-based').click();
  //   });

  it('should allow selecting agentless option when agentless is available', () => {
    cy.visit('/app/integrations/detail/cloud_security_posture');

    cy.getBySel(ADD_INTEGRATION_POLICY_BTN).click();
    cy.getBySel('setup-technology-selector-accordion').click();
    cy.getBySel('setup-technology-selector').click();
    cy.get('.euiContextMenuItem').contains('Agentless').click();
    cy.get('#name').type(`cloud_security_posture-${new Date().toISOString()}`);
    cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  });
});
