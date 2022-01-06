/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_POLICIES_TAB, ENROLLMENT_TOKENS_TAB } from '../screens/fleet';
import { cleanupAgentPolicies } from '../tasks/cleanup';
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

  function verifyFleetServerPolicy(name: string, integration: string) {
    navigateToAgentPolicies();

    navigateToAgentPolicy(name);
    cy.get('.euiLink').contains(integration);

    cy.get('.euiButtonEmpty').contains('View all agent policies').click();

    navigateToEnrollmentTokens();

    cy.get('.euiTableCellContent').contains(name);
  }

  describe('Fleet Server', () => {
    it('should display Add agent button and Healthy agent once Fleet Agent page loaded', () => {
      cy.get('.euiBadge').contains('Healthy');

      verifyFleetServerPolicy('Fleet Server policy', 'Fleet Server');
    });
  });

  describe('Create policies', () => {
    after(() => {
      cleanupAgentPolicies();
    });

    // one policy was created in runner.ts to enroll a fleet server before starting cypress tests
    it('should have one agent policy by default created through API', () => {
      cy.request('/api/fleet/agent_policies?full=true').then((response: any) => {
        expect(response.body.items.length).to.equal(1);
        expect(response.body.items[0].name).to.equal('Fleet Server policy');
      });
    });

    // TODO can be recreated after force unenroll and delete policy
    it.skip('should create Fleet Server policy', () => {
      cy.getBySel('toastCloseButton').click();
      cy.getBySel('addFleetServerBtn').click();
      cy.getBySel('euiToastHeader');

      verifyFleetServerPolicy('Fleet Server policy 1', 'Fleet Server');
    });

    it('should create agent policy', () => {
      cy.getBySel('addAgentButton').click();
      cy.getBySel('toastCloseButton').click();
      cy.getBySel('standaloneTab').click();
      cy.getBySel('createPolicyBtn').click();
      cy.getBySel('euiToastHeader');
      cy.get('.euiLoadingSpinner').should('not.exist');
      cy.getBySel('euiFlyoutCloseButton').click();

      verifyFleetServerPolicy('Agent policy 1', 'System');

      // TODO might take longer to install elastic agent async

      cy.visit('/app/integrations/installed');
      cy.getBySel('integration-card:epr:elastic_agent');
    });
  });
});
