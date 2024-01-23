/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_AGENT_LIST_PAGE } from '../../screens/fleet';

import { createAgentDoc } from '../../tasks/agents';
import { setupFleetServer } from '../../tasks/fleet_server';
import { deleteFleetServerDocs, deleteAgentDocs, cleanupAgentPolicies } from '../../tasks/cleanup';
import type { CreateAgentPolicyRequest } from '../../../common/types';
import { setUISettings } from '../../tasks/ui_settings';

import { API_VERSIONS } from '../../../common/constants';
import { request } from '../../tasks/common';
import { login } from '../../tasks/login';

const createAgentDocs = (kibanaVersion: string) => [
  createAgentDoc('agent-1', 'policy-1'), // this agent will have upgrade available
  createAgentDoc('agent-2', 'policy-2', 'error', kibanaVersion),
  ...[...Array(2).keys()].map((_, index) =>
    createAgentDoc(`agent-${index + 3}`, 'policy-3', undefined, undefined, {
      tags: ['tag1', 'tag2'],
    })
  ),
  ...[...Array(2).keys()].map((_, index) =>
    createAgentDoc(`agent-${index + 5}`, 'policy-3', undefined, undefined, {
      tags: ['tag2'],
    })
  ),
  ...[...Array(11).keys()].map((_, index) => createAgentDoc(`agent-${index + 6}`, 'policy-3')),
];

let docs: any[] = [];

const POLICIES: Array<CreateAgentPolicyRequest['body']> = [
  {
    id: 'policy-1',
    name: 'Agent policy 1',
    description: '',
    namespace: 'default',
    monitoring_enabled: ['logs', 'metrics'],
  },
  {
    id: 'policy-2',
    name: 'Agent policy 2',
    description: '',
    namespace: 'default',
    monitoring_enabled: ['logs', 'metrics'],
  },
  {
    id: 'policy-3',
    name: 'Agent policy 3',
    description: '',
    namespace: 'default',
    monitoring_enabled: ['logs', 'metrics'],
  },
  {
    id: 'policy-4',
    name: 'Agent policy 4',
    description: '',
    namespace: 'default',
    monitoring_enabled: ['logs', 'metrics'],
  },
];

function createAgentPolicy(body: CreateAgentPolicyRequest['body']) {
  request({
    method: 'POST',
    url: '/api/fleet/agent_policies',
    headers: { 'kbn-xsrf': 'xx', 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
    body,
  });
}

function assertTableContainsNAgents(n: number) {
  cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE)
    .find('tr')
    .should('have.length', n + 1); // header
}

function assertTableIsEmpty() {
  cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('No agents found');
}

describe('View agents list', () => {
  before(() => {
    deleteFleetServerDocs(true);
    deleteAgentDocs(true);
    cleanupAgentPolicies();
    setupFleetServer();
    setUISettings('hideAgentActivityTour', true);

    cy.getKibanaVersion().then((version) => {
      docs = createAgentDocs(version);
      cy.task('insertDocs', { index: '.fleet-agents', docs });
    });

    for (const policy of POLICIES) {
      createAgentPolicy(policy);
    }
  });
  after(() => {
    deleteFleetServerDocs(true);
    deleteAgentDocs(true);
    cleanupAgentPolicies();
  });
  beforeEach(() => {
    login();

    cy.intercept('/api/fleet/agents/setup', {
      isReady: true,
      missing_optional_features: [],
      missing_requirements: [],
    });
    cy.intercept('/api/fleet/setup', { isInitialized: true, nonFatalErrors: [] });
    cy.intercept('/api/fleet/agents_status', {
      total: 18,
      inactive: 0,
      online: 18,
      error: 0,
      offline: 0,
      updating: 0,
      other: 0,
      events: 0,
    });
    cy.intercept('GET', /\/api\/fleet\/agents/).as('getAgents');
  });

  describe('Agent filter suggestions', () => {
    it('should filter based on agent id', () => {
      cy.visit('/app/fleet/agents');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.QUERY_INPUT).type('agent.id: "agent-1"{enter}');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE);
      assertTableContainsNAgents(1);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-1');
    });
  });

  describe('Upgrade available filter', () => {
    it('should only show agents with upgrade available after click', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel(FLEET_AGENT_LIST_PAGE.SHOW_UPGRADEABLE).click();
      assertTableContainsNAgents(16);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-1');
    });

    it('should clear filter on second click', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel(FLEET_AGENT_LIST_PAGE.SHOW_UPGRADEABLE).click();
      cy.getBySel(FLEET_AGENT_LIST_PAGE.SHOW_UPGRADEABLE).click();
      assertTableContainsNAgents(18);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-1');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-2');
    });
  });

  describe('Agent policy filter', () => {
    it('should should show all policies as options', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel(FLEET_AGENT_LIST_PAGE.POLICY_FILTER).click();

      cy.get('li').contains('Agent policy 1');
      cy.get('li').contains('Agent policy 2');
      cy.get('li').contains('Agent policy 3');
    });

    it('should filter on single policy (no results)', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel(FLEET_AGENT_LIST_PAGE.POLICY_FILTER).click();

      cy.get('li').contains('Agent policy 4').click();

      assertTableIsEmpty();
    });

    it('should filter on single policy', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel(FLEET_AGENT_LIST_PAGE.POLICY_FILTER).click();

      cy.get('li').contains('Agent policy 1').click();

      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).find('tr').should('have.length', 2);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-1');
    });

    it('should filter on multiple policies', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel(FLEET_AGENT_LIST_PAGE.POLICY_FILTER).click();

      cy.get('li').contains('Agent policy 1').click();
      cy.get('li').contains('Agent policy 2').click();

      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).find('tr').should('have.length', 3);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-1');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-2');
    });
  });

  describe('Agent status filter', () => {
    const clearFilters = () => {
      cy.getBySel(FLEET_AGENT_LIST_PAGE.STATUS_FILTER).click();
      cy.get('li').contains('Healthy').click();
      cy.get('li').contains('Unhealthy').click();
      cy.get('li').contains('Updating').click();
      cy.get('li').contains('Offline').click();
      cy.getBySel(FLEET_AGENT_LIST_PAGE.STATUS_FILTER).click();
      cy.wait('@getAgents');
    };
    it('should filter on healthy (16 result)', () => {
      cy.visit('/app/fleet/agents');
      clearFilters();
      cy.getBySel(FLEET_AGENT_LIST_PAGE.STATUS_FILTER).click();

      cy.get('li').contains('Healthy').click();
      cy.wait('@getAgents');

      assertTableContainsNAgents(18);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-1');
    });

    it('should filter on unhealthy (1 result)', () => {
      cy.visit('/app/fleet/agents');
      clearFilters();
      cy.getBySel(FLEET_AGENT_LIST_PAGE.STATUS_FILTER).click();

      cy.get('li').contains('Unhealthy').click();
      cy.wait('@getAgents');

      assertTableContainsNAgents(1);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-2');
    });

    it('should filter on inactive (0 result)', () => {
      cy.visit('/app/fleet/agents');
      clearFilters();

      cy.getBySel(FLEET_AGENT_LIST_PAGE.STATUS_FILTER).click();

      cy.get('li').contains('Inactive').click();

      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('No agents found');
    });

    it('should filter on healthy and unhealthy', () => {
      cy.visit('/app/fleet/agents');
      clearFilters();

      cy.getBySel(FLEET_AGENT_LIST_PAGE.STATUS_FILTER).click();

      cy.get('li').contains('Healthy').click();
      cy.get('li').contains('Unhealthy').click();
      cy.wait('@getAgents');

      assertTableContainsNAgents(18);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-1');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-2');
    });
  });

  describe('Tags filter', () => {
    it('should allow to filter on one tag (tag1)', () => {
      cy.visit('/app/fleet/agents');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TAGS_FILTER).click();
      cy.get('li').contains('tag1').click();

      assertTableContainsNAgents(2);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-3');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-4');
    });

    it('should allow to filter on multiple tag (tag1, tag2)', () => {
      cy.visit('/app/fleet/agents');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TAGS_FILTER).click();
      cy.get('li').contains('tag1').click();
      cy.get('li').contains('tag2').click();
      cy.wait('@getAgents');

      assertTableContainsNAgents(4);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-3');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-4');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-5');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TABLE).contains('agent-6');
    });

    it('should allow to clear filters', () => {
      cy.visit('/app/fleet/agents');
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TAGS_FILTER).click();
      cy.get('li').contains('tag1').click();
      cy.get('li').contains('tag2').click();
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TAGS_FILTER).click();

      assertTableContainsNAgents(4);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.TAGS_FILTER).click();
      cy.get('button').contains('Clear all').click();
      assertTableContainsNAgents(18);
    });
  });

  describe('Bulk actions', () => {
    it('should allow to bulk upgrade agents and cancel that upgrade', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel(FLEET_AGENT_LIST_PAGE.POLICY_FILTER).click();

      cy.get('li').contains('Agent policy 3').click();
      assertTableContainsNAgents(15);

      cy.getBySel(FLEET_AGENT_LIST_PAGE.CHECKBOX_SELECT_ALL).click();
      // Trigger a bulk upgrade
      cy.getBySel(FLEET_AGENT_LIST_PAGE.BULK_ACTIONS_BUTTON).click();
      cy.get('button').contains('Upgrade 15 agents').click();
      cy.get('.euiModalFooter button:enabled').contains('Upgrade 15 agents').click();

      // Expect agent status to be Updating
      cy.get('.euiBadge:contains("Updating")').should('have.length', 15);

      // Cancel upgrade
      cy.getBySel(FLEET_AGENT_LIST_PAGE.ACTIVITY_BUTTON).click();

      cy.getBySel(FLEET_AGENT_LIST_PAGE.ACTIVITY_FLYOUT.FLYOUT_ID).contains(/Upgrading 15 agents/);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.ACTIVITY_FLYOUT.FLYOUT_ID)
        .get('button')
        .contains('Cancel')
        .click();

      cy.get('button').contains('Confirm').click();

      cy.getBySel(FLEET_AGENT_LIST_PAGE.ACTIVITY_FLYOUT.CLOSE_BUTTON).click();

      // Expect agent status to be Healthy
      cy.get('.euiBadge:contains("Healthy")').should('have.length', 15);
    });

    it('should allow to bulk edit agent tags', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel(FLEET_AGENT_LIST_PAGE.POLICY_FILTER).click();

      cy.get('li').contains('Agent policy 3').click();
      assertTableContainsNAgents(15);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.CHECKBOX_SELECT_ALL).click();
      // Trigger a bulk upgrade
      cy.getBySel(FLEET_AGENT_LIST_PAGE.BULK_ACTIONS_BUTTON).click();
      cy.get('button').contains('Add / remove tags').click();

      cy.getBySel(FLEET_AGENT_LIST_PAGE.BULK_ACTIONS.ADD_REMOVE_TAG_INPUT).focus();
      cy.wait(500);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.BULK_ACTIONS.ADD_REMOVE_TAG_INPUT).type('tagtest{enter}');
      cy.get('button').contains('Create a new tag "tagtest"').click();
    });

    it('should allow to bulk reassign agent to another policy', () => {
      cy.visit('/app/fleet/agents');

      cy.getBySel(FLEET_AGENT_LIST_PAGE.POLICY_FILTER).click();
      cy.get('li').contains('Agent policy 3').click();
      cy.wait('@getAgents');
      assertTableContainsNAgents(15);
      cy.getBySel(FLEET_AGENT_LIST_PAGE.CHECKBOX_SELECT_ALL).click();
      // Trigger a bulk upgrade
      cy.getBySel(FLEET_AGENT_LIST_PAGE.BULK_ACTIONS_BUTTON).click();
      cy.get('button').contains('Assign to new policy').click();
      cy.get('.euiModalBody select').select('Agent policy 4');
      cy.get('.euiModalFooter button:enabled').contains('Assign policy').click();
      cy.wait('@getAgents');
      assertTableIsEmpty();
      // Select new policy is filters
      cy.getBySel(FLEET_AGENT_LIST_PAGE.POLICY_FILTER).click();
      cy.get('li').contains('Agent policy 4').click();
      cy.wait('@getAgents');
      assertTableContainsNAgents(15);

      // Change back those agents to Agent policy 3
      cy.getBySel(FLEET_AGENT_LIST_PAGE.CHECKBOX_SELECT_ALL).click();
      // Trigger a bulk upgrade
      cy.getBySel(FLEET_AGENT_LIST_PAGE.BULK_ACTIONS_BUTTON).click();
      cy.get('button').contains('Assign to new policy').click();
      cy.get('.euiModalBody select').select('Agent policy 3');
      cy.get('.euiModalFooter button:enabled').contains('Assign policy').click();
    });
  });
});
