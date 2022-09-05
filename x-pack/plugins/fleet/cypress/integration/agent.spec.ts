/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAgentDoc } from '../tasks/agents';

const createAgentDocs = (kibanaVersion: string) => [
  createAgentDoc('agent-1', 'policy-1'), // this agent will have upgrade available
  createAgentDoc('agent-2', 'policy-2', 'error', kibanaVersion),
  ...[...Array(15).keys()].map((_, index) => createAgentDoc(`agent-${index + 2}`, 'policy-3')),
];

let docs: any[] = [];
// TODO: create fleet server, fix version of agent to upgrade to an allowed version (>= fleet server's, < kibana)
// https://github.com/elastic/kibana/issues/138121
describe.skip('View agents', () => {
  before(() => {
    cy.task('deleteDocsByQuery', {
      index: '.fleet-agents',
      query: { match_all: {} },
      ignoreUnavailable: true,
    });
    cy.getKibanaVersion().then((version) => {
      docs = createAgentDocs(version);
      cy.task('insertDocs', { index: '.fleet-agents', docs });
    });
  });
  after(() => {
    cy.task('deleteDocsByQuery', {
      index: '.fleet-agents',
      query: { match_all: {} },
    });
  });
  beforeEach(() => {
    cy.intercept('/api/fleet/agents/setup', { isReady: true });
    cy.intercept('/api/fleet/setup', { isInitialized: true, nonFatalErrors: [] });
    cy.intercept(/\/api\/fleet\/agent_policies(\?.*)?$/, {
      items: [
        {
          id: 'policy-1',
          name: 'Agent policy 1',
          description: '',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          status: 'active',
        },
        {
          id: 'policy-2',
          name: 'Agent policy 2',
          description: '',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          status: 'active',
        },
        {
          id: 'policy-3',
          name: 'Agent policy 3',
          description: '',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          status: 'active',
        },
        {
          id: 'policy-4',
          name: 'Agent policy 4',
          description: '',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          status: 'active',
        },
      ],
    });
  });

  describe('Agent filter suggestions', () => {
    it('should filter based on agent id', () => {
      cy.visit('/app/fleet/agents');
      cy.getBySel('agentList.queryInput').type('agent.id: "agent-1"{enter}');
      cy.getBySel('fleetAgentListTable');
      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 2);
      cy.getBySel('fleetAgentListTable').contains('agent-1');
    });
  });

  describe('Upgrade available filter', () => {
    it('should only show agents with upgrade available after click', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.showUpgradeable').click();
      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 17);
      cy.getBySel('fleetAgentListTable').contains('agent-1');
    });

    it('should clear filter on second click', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.showUpgradeable').click();
      cy.getBySel('agentList.showUpgradeable').click();
      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 18);
      cy.getBySel('fleetAgentListTable').contains('agent-1');
      cy.getBySel('fleetAgentListTable').contains('agent-2');
    });
  });

  describe('Agent policy filter', () => {
    it('should should show all policies as options', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.policyFilter').click();

      cy.get('button').contains('Agent policy 1');
      cy.get('button').contains('Agent policy 2');
      cy.get('button').contains('Agent policy 3');
    });
    it('should filter on single policy (no results)', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.policyFilter').click();

      cy.get('button').contains('Agent policy 4').click();

      cy.getBySel('fleetAgentListTable').contains('No agents found');
    });
    it('should filter on single policy', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.policyFilter').click();

      cy.get('button').contains('Agent policy 1').click();

      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 2);
      cy.getBySel('fleetAgentListTable').contains('agent-1');
    });
    it('should filter on multiple policies', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.policyFilter').click();

      cy.get('button').contains('Agent policy 1').click();
      cy.get('button').contains('Agent policy 2').click();

      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 3);
      cy.getBySel('fleetAgentListTable').contains('agent-1');
      cy.getBySel('fleetAgentListTable').contains('agent-2');
    });
  });
  describe('Agent status filter', () => {
    it('should filter on healthy (16 result)', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.statusFilter').click();

      cy.get('button').contains('Healthy').click();

      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 17);
      cy.getBySel('fleetAgentListTable').contains('agent-1');
    });
    it('should filter on unhealthy (1 result)', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.statusFilter').click();

      cy.get('button').contains('Unhealthy').click();

      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 2);
      cy.getBySel('fleetAgentListTable').contains('agent-2');
    });
    it('should filter on inactive (0 result)', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.statusFilter').click();

      cy.get('button').contains('Inactive').click();

      cy.getBySel('fleetAgentListTable').contains('No agents found');
    });
    it('should filter on healthy and unhealthy', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.statusFilter').click();

      cy.get('button').contains('healthy').click();
      cy.get('button').contains('Unhealthy').click();

      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 18);
      cy.getBySel('fleetAgentListTable').contains('agent-1');
      cy.getBySel('fleetAgentListTable').contains('agent-2');
    });
  });

  describe('Bulk actions', () => {
    it('should allow to bulk upgrade agents', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.policyFilter').click();

      cy.get('button').contains('Agent policy 3').click();
      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 16);

      cy.getBySel('checkboxSelectAll').click();
      // Trigger a bulk upgrade
      cy.getBySel('agentBulkActionsButton').click();
      cy.get('button').contains('Upgrade 15 agents').click();
      cy.get('.euiModalFooter button').contains('Upgrade 15 agents').click();
      // Cancel upgrade
      cy.getBySel('abortUpgradeBtn').click();
      cy.get('button').contains('Confirm').click();
    });
  });
});
