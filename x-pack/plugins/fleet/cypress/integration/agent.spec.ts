/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const agent = {
  id: 'agent-1',
  access_api_key_id: 'abcdefghijklmn',
  action_seq_no: [-1],
  active: true,
  agent: {
    id: 'agent-1',
    version: '8.1.0',
  },
  enrolled_at: '2022-03-07T14:02:00Z',
  local_metadata: {
    elastic: {
      agent: {
        'build.original': '8.1.0',
        id: 'agent-1',
        log_level: 'info',
        snapshot: true,
        upgradeable: true,
        version: '8.1.0',
      },
    },
    host: {
      architecture: 'x86_64',
      hostname: 'agent-1',
      id: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
      ip: ['127.0.0.1/8'],
      mac: ['ab:cd:12:34:56:78'],
      name: 'agent-1',
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
  policy_id: 'policy-1',
  type: 'PERMANENT',
  default_api_key: 'abcdefg',
  default_api_key_id: 'abcd',
  policy_output_permissions_hash: 'somehash',
  updated_at: '2022-03-07T16:35:03Z',
  last_checkin_status: 'online',
  last_checkin: '2022-03-07T16:34:56Z',
  policy_revision_idx: 1,
  policy_coordinator_idx: 1,
  policy_revision: 1,
  status: 'online',
  packages: [],
};

// getAgents can be called many times on load, wait() was grabbing the wrong call
// .all returns all requests performed so far, allowing us to reliably grab the most recent call
const getLatestRequestUrl = (selector: string) =>
  cy.get(selector + '.all').then((requests) => {
    if (!requests.length) return undefined;
    const latestRequest = requests[requests.length - 1];
    // @ts-ignore no property url, typing is wrong for return type of .all
    return new URL(latestRequest?.request?.url);
  });

describe('View agents', () => {
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
      ],
    });
    cy.intercept('/api/fleet/agent_status', {
      results: {
        total: 1,
        inactive: 0,
        online: 1,
        error: 0,
        offline: 0,
        updating: 0,
        other: 0,
        events: 0,
      },
    });
    cy.intercept(/\/api\/fleet\/agents(\?.*)?$/, {
      items: [agent],
      list: [agent],
      total: 1,
    }).as('getAgents');
  });

  describe('Agent filter suggestions', () => {
    it('should show correct suggestions for agent.id', () => {
      cy.intercept(/\/api\/index_patterns*/, {
        fields: [
          {
            name: 'agent.id',
            type: 'string',
            esTypes: ['keyword'],
            searchable: true,
            aggregatable: true,
            readFromDocValues: true,
            metadata_field: false,
          },
        ],
      });
      cy.intercept('/api/kibana/suggestions/values/.fleet-agents', [
        'suggestion1',
        'suggestion2',
      ]).as('getSuggestions');

      cy.visit('/app/fleet/agents');
      cy.getBySel('queryInput').clear().type('agent.id: ');

      cy.wait('@getSuggestions').then(({ request }) => {
        expect(request.body.field).to.equal('agent.id');
      });

      cy.get('.kbnTypeahead').within(() => {
        cy.contains('suggestion1');
        cy.contains('suggestion2');
      });
    });
  });

  describe('Upgrade available filter', () => {
    it('should call API with correct query param on click ', () => {
      cy.visit('/app/fleet/agents');
      cy.contains('agent-1');

      cy.getBySel('agentList.showUpgradeable').click();
      getLatestRequestUrl('@getAgents').then((url) => {
        expect(url).instanceOf(URL);
        // @ts-ignore
        expect(url.searchParams.get('showUpgradeable')).equals('true');
      });
    });
  });

  describe('Agent policy filter', () => {
    it('should should show all policies as options', () => {
      cy.visit('/app/fleet/agents');
      cy.contains('agent-1');

      cy.getBySel('agentList.policyFilter').click();

      cy.get('button').contains('Agent policy 1');
      cy.get('button').contains('Agent policy 2');
    });
    it('should filter on policy', () => {
      cy.visit('/app/fleet/agents');
      cy.contains('agent-1');

      cy.getBySel('agentList.policyFilter').click();

      cy.get('button').contains('Agent policy 2').click();
      getLatestRequestUrl('@getAgents').then((url) => {
        expect(url).instanceOf(URL);
        // @ts-ignore
        expect(url.searchParams.get('kuery')).contains('fleet-agents.policy_id : ("policy-2")');
      });
    });
  });
});
