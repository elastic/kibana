/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENTS_TAB,
  ADD_AGENT_BUTTON_TOP,
  AGENT_FLYOUT_CLOSE_BUTTON,
  STANDALONE_TAB,
  AGENT_POLICY_CODE_BLOCK,
} from '../screens/fleet';
import { cleanupAgentPolicies, unenrollAgent } from '../tasks/cleanup';
import { verifyPolicy, verifyAgentPackage, navigateToTab } from '../tasks/fleet';
import { FLEET, navigateTo } from '../tasks/navigation';

describe('Fleet startup', () => {
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
      cy.getBySel(ADD_AGENT_BUTTON_TOP).click();
      cy.getBySel(STANDALONE_TAB).click();

      cy.intercept('POST', '/api/fleet/agent_policies?sys_monitoring=true').as('createAgentPolicy');

      cy.getBySel('createPolicyBtn').click();

      let agentPolicyId: string;
      const startTime = Date.now();
      cy.wait('@createAgentPolicy', { timeout: 180000 }).then((xhr: any) => {
        cy.log('Create agent policy took: ' + (Date.now() - startTime) / 1000 + ' s');
        agentPolicyId = xhr.response.body.item.id;

        // verify create button changed to dropdown
        cy.getBySel('agentPolicyDropdown');

        // verify agent.yml code block has new policy id
        cy.getBySel(AGENT_POLICY_CODE_BLOCK).contains(`id: ${agentPolicyId}`);

        cy.getBySel(AGENT_FLYOUT_CLOSE_BUTTON).click();

        // verify policy is created and has system package
        verifyPolicy('Agent policy 1', ['System']);

        verifyAgentPackage();
      });
    });

    it('should create Fleet Server policy', () => {
      cy.getBySel('createFleetServerPolicyBtn').click();

      // verify policy is created and has fleet server and system package
      verifyPolicy('Fleet Server policy 1', ['Fleet Server', 'System']);

      navigateToTab(AGENTS_TAB);
      // verify create button changed to dropdown
      cy.getBySel('agentPolicyDropdown');

      // verify fleet server enroll command contains created policy id
      cy.getBySel('fleetServerHostInput').type('https://localhost:8220');
      cy.getBySel('fleetServerAddHostBtn').click();
      cy.getBySel('fleetServerGenerateServiceTokenBtn').click();
      cy.get('.euiCodeBlock__code').contains('--fleet-server-policy=fleet-server-policy');
    });
  });
});
