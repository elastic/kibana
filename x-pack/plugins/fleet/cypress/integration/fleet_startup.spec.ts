/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_POLICIES_TAB, ENROLLMENT_TOKENS_TAB } from '../screens/fleet';
import { cleanupAgentPolicies, unenrollAgent } from '../tasks/cleanup';
import { FLEET, navigateTo } from '../tasks/navigation';

describe('Fleet startup', () => {
  beforeEach(() => {
    navigateTo(FLEET);
  });

  function navigateToAgentPolicies() {
    cy.getBySel(AGENT_POLICIES_TAB).click();
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
    navigateToAgentPolicies();

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

    before(() => {
      // hosts needed to be set so that UI shows fleet server instructions
      cy.request({
        method: 'PUT',
        url: '/api/fleet/settings',
        body: { fleet_server_hosts: ['http://localhost:8220'] },
        headers: { 'kbn-xsrf': 'kibana' },
      });
    });

    it('should have no agent policy by default', () => {
      cy.request('/api/fleet/agent_policies?full=true').then((response: any) => {
        expect(response.body.items.length).to.equal(0);
      });
    });

    it('should create agent policy', () => {
      cy.getBySel('addAgentBtnTop').click();
      cy.getBySel('toastCloseButton').click();
      cy.getBySel('standaloneTab').click();

      cy.intercept('POST', '/api/fleet/agent_policies?sys_monitoring=true').as('createAgentPolicy');

      cy.getBySel('createPolicyBtn').click();

      const startTime = Date.now();
      cy.wait('@createAgentPolicy', { timeout: 180000 }).then((xhr: any) => {
        cy.log('Create agent policy took: ' + (Date.now() - startTime) / 1000 + ' s');
      });

      cy.getBySel('euiToastHeader');
      cy.get('.euiLoadingSpinner').should('not.exist');

      cy.getBySel('euiFlyoutCloseButton').click();

      verifyPolicy('Agent policy 1', ['System']);

      verifyAgentPackage();
    });

    it('should create Fleet Server policy', () => {
      cy.getBySel('toastCloseButton').click();

      cy.getBySel('createFleetServerPolicyBtn').click();
      cy.getBySel('euiToastHeader');

      verifyPolicy('Fleet Server policy 1', ['Fleet Server', 'System']);
    });
  });
});
