/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// 8.1.0 is not significant its just a version < current version
const createAgentDoc = (
  id: string,
  policy: string,
  status = 'online',
  version: string = '8.1.0'
) => ({
  access_api_key_id: 'abcdefghijklmn',
  action_seq_no: [-1],
  active: true,
  agent: {
    id,
    version,
  },
  enrolled_at: '2022-03-07T14:02:00Z',
  local_metadata: {
    elastic: {
      agent: {
        'build.original': version,
        id,
        log_level: 'info',
        snapshot: true,
        upgradeable: true,
        version,
      },
    },
    host: {
      architecture: 'x86_64',
      hostname: id,
      id: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
      ip: ['127.0.0.1/8'],
      mac: ['ab:cd:12:34:56:78'],
      name: id,
    },
    os: {
      family: 'darwin',
      full: 'Mac OS X(10.16)',
      kernel: '21.3.0',
      name: 'Mac OS X',
      platform: 'darwin',
      version: '10.16',
    },
  },
  policy_id: policy,
  type: 'PERMANENT',
  default_api_key: 'abcdefg',
  default_api_key_id: 'abcd',
  policy_output_permissions_hash: 'somehash',
  updated_at: '2022-03-07T16:35:03Z',
  last_checkin_status: status,
  last_checkin: new Date(),
  policy_revision_idx: 1,
  policy_coordinator_idx: 1,
  policy_revision: 1,
  status,
  packages: [],
});

const createAgentDocs = (kibanaVersion: string) => [
  createAgentDoc('agent-1', 'policy-1'), // this agent will have upgrade available
  createAgentDoc('agent-2', 'policy-2', 'error', kibanaVersion),
];

let docs: any[] = [];
describe('View agents', () => {
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
      ],
    });
  });

  describe('Agent filter suggestions', () => {
    it('should filter based on agent id', () => {
      cy.visit('/app/fleet/agents');
      cy.getBySel('agentList.queryInput').type('agent.id: agent-1{enter}');
      cy.getBySel('fleetAgentListTable');
      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 2);
      cy.getBySel('fleetAgentListTable').contains('agent-1');
    });
  });

  describe('Upgrade available filter', () => {
    it('should only show agents with upgrade available after click', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.showUpgradeable').click();
      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 2);
      cy.getBySel('fleetAgentListTable').contains('agent-1');
    });

    it('should clear filter on second click', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.showUpgradeable').click();
      cy.getBySel('agentList.showUpgradeable').click();
      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 3);
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

      cy.get('button').contains('Agent policy 3').click();

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
    it('should filter on healthy (1 result)', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel('agentList.statusFilter').click();

      cy.get('button').contains('Healthy').click();

      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 2);
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

      cy.getBySel('fleetAgentListTable').find('tr').should('have.length', 3);
      cy.getBySel('fleetAgentListTable').contains('agent-1');
      cy.getBySel('fleetAgentListTable').contains('agent-2');
    });
  });
});
