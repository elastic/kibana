/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTS_TAB, AGENT_POLICIES_TAB, ENROLLMENT_TOKENS_TAB } from '../screens/fleet';
import { CONFIRM_MODAL_BTN } from '../screens/integrations';
import { cleanupAgentPolicies, unenrollAgent } from '../tasks/cleanup';
import { FLEET, navigateTo } from '../tasks/navigation';

describe('Fleet startup', () => {
  function navigateToTab(tab: string) {
    cy.getBySel(tab).click();
    cy.get('.euiBasicTable-loading').should('not.exist');
  }

  function navigateToAgentPolicy(name: string) {
    cy.get('.euiLink').contains(name).click();
    cy.get('.euiLoadingSpinner').should('not.exist');
  }

  function navigateToEnrollmentTokens() {
    cy.getBySel(ENROLLMENT_TOKENS_TAB).click();
    cy.get('.euiBasicTable-loading').should('not.exist');
    cy.get('.euiButtonIcon--danger'); // wait for trash icon
  }

  function verifyPolicy(name: string, integrations: string[]) {
    navigateToTab(AGENT_POLICIES_TAB);

    navigateToAgentPolicy(name);
    integrations.forEach((integration) => {
      cy.get('.euiLink').contains(integration);
    });

    cy.get('.euiButtonEmpty').contains('View all agent policies').click();

    navigateToEnrollmentTokens();

    cy.get('.euiTableCellContent').contains(name);
  }

  function verifyAgentPackage() {
    cy.visit('/app/integrations/installed');
    cy.getBySel('integration-card:epr:elastic_agent');
  }

  // skipping Fleet Server enroll, to enable, comment out runner.ts line 23
  describe.skip('Fleet Server', () => {
    it('should display Add agent button and Healthy agent once Fleet Agent page loaded', () => {
      navigateTo(FLEET);
      cy.get('.euiBadge').contains('Healthy');

      verifyPolicy('Fleet Server policy', ['Fleet Server']);
    });

    after(() => {
      unenrollAgent();
      cleanupAgentPolicies();
    });
  });

  describe('Create policies', () => {
    after(() => {
      cleanupAgentPolicies();
    });

    beforeEach(() => {
      navigateTo(FLEET);
    });

    it('should have no agent policy by default', () => {
      cy.request('/api/fleet/agent_policies?full=true').then((response: any) => {
        expect(response.body.items.length).to.equal(0);
      });
    });

    it('should create agent policy', () => {
      cy.getBySel('addAgentBtnTop').click();
      cy.getBySel('standaloneTab').click();

      cy.intercept('POST', '/api/fleet/agent_policies?sys_monitoring=true').as('createAgentPolicy');

      cy.getBySel('createPolicyBtn').click();

      let agentPolicyId: string;
      const startTime = Date.now();
      cy.wait('@createAgentPolicy', { timeout: 180000 }).then((xhr: any) => {
        cy.log('Create agent policy took: ' + (Date.now() - startTime) / 1000 + ' s');
        agentPolicyId = xhr.response.body.item.id;

        cy.getBySel('agentPolicyCreateStatusCallOut').contains('Agent policy created');

        // verify create button changed to dropdown
        cy.getBySel('agentPolicyDropdown');
        // verify agent.yml code block has new policy id
        cy.get('.euiCodeBlock__code').contains(`id: ${agentPolicyId}`);

        cy.getBySel('euiFlyoutCloseButton').click();

        // verify policy is created and has system package
        verifyPolicy('Agent policy 1', ['System']);

        verifyAgentPackage();
      });
    });

    it('should create Fleet Server policy', () => {
      cy.getBySel('createFleetServerPolicyBtn').click();
      cy.getBySel('agentPolicyCreateStatusCallOut').contains('Agent policy created');

      // verify policy is created and has fleet server and system package
      verifyPolicy('Fleet Server policy 1', ['Fleet Server', 'System']);

      navigateToTab(AGENTS_TAB);
      // verify create button changed to dropdown
      cy.getBySel('agentPolicyDropdown');

      // verify fleet server enroll command contains created policy id
      cy.getBySel('fleetServerHostInput').type('http://localhost:8220');
      cy.getBySel('fleetServerAddHostBtn').click();
      cy.getBySel('fleetServerGenerateServiceTokenBtn').click();
      cy.get('.euiCodeBlock__code').contains('--fleet-server-policy=fleet-server-policy');
    });
  });

  describe('Edit settings', () => {
    beforeEach(() => {
      cy.intercept('/api/fleet/settings', {
        item: { id: 'fleet-default-settings', fleet_server_hosts: [] },
      });
      cy.intercept('/api/fleet/outputs', {
        items: [
          {
            id: 'fleet-default-output',
            name: 'default',
            type: 'elasticsearch',
            is_default: true,
            is_default_monitoring: true,
          },
        ],
      });

      cy.visit('/app/fleet/settings');
      cy.getBySel('toastCloseButton').click();
    });

    it('should update hosts', () => {
      cy.getBySel('editHostsBtn').click();
      cy.get('[placeholder="Specify host URL"').type('http://localhost:8220');

      cy.intercept('/api/fleet/settings', {
        item: { id: 'fleet-default-settings', fleet_server_hosts: ['http://localhost:8220'] },
      });
      cy.intercept('PUT', '/api/fleet/settings', {
        fleet_server_hosts: ['http://localhost:8220'],
      }).as('updateSettings');

      cy.getBySel('saveApplySettingsBtn').click();
      cy.getBySel(CONFIRM_MODAL_BTN).click();

      cy.wait('@updateSettings').then((interception) => {
        expect(interception.request.body.fleet_server_hosts[0]).to.equal('http://localhost:8220');
      });
    });

    it('should update outputs', () => {
      cy.getBySel('editOutputBtn').click();
      cy.get('[placeholder="Specify name"').clear().type('output-1');

      cy.intercept('/api/fleet/outputs', {
        items: [
          {
            id: 'fleet-default-output',
            name: 'output-1',
            type: 'elasticsearch',
            is_default: true,
            is_default_monitoring: true,
          },
        ],
      });
      cy.intercept('PUT', '/api/fleet/outputs/fleet-default-output', {
        name: 'output-1',
        type: 'elasticsearch',
        is_default: true,
        is_default_monitoring: true,
      }).as('updateOutputs');

      cy.getBySel('saveApplySettingsBtn').click();
      cy.getBySel(CONFIRM_MODAL_BTN).click();

      cy.wait('@updateOutputs').then((interception) => {
        expect(interception.request.body.name).to.equal('output-1');
      });
    });
  });
});
