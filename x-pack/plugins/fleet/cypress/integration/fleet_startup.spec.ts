/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_POLICIES_TAB, ENROLLMENT_TOKENS_TAB } from '../screens/fleet';
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

  it('should have no agent policies by default', () => {
    cy.request('/api/fleet/agent_policies?full=true').then((response: any) => {
      expect(response.body.items.length).to.equal(0);
    });
  });

  it('should create Default Fleet Server policy', () => {
    cy.getBySel('toastCloseButton').click();
    cy.getBySel('createFleetServerPolicyBtn').click();
    cy.getBySel('euiToastHeader');

    navigateToAgentPolicies();

    navigateToAgentPolicy('Default Fleet Server policy');
    cy.get('.euiLink').contains('Fleet Server');

    cy.get('.euiButtonEmpty').contains('View all agent policies').click();

    navigateToEnrollmentTokens();

    cy.get('.euiTableCellContent').contains('Default Fleet Server policy');
  });

  it('should create Default policy', () => {
    cy.getBySel('addAgentBtnTop').click();
    cy.getBySel('toastCloseButton').click();
    cy.getBySel('createPolicyBtn').click();
    cy.getBySel('euiToastHeader');
    cy.get('.euiLoadingSpinner').should('not.exist');
    cy.getBySel('euiFlyoutCloseButton').click();

    navigateToAgentPolicies();

    navigateToAgentPolicy('Default policy');
    cy.get('.euiLink').contains('System');

    cy.get('.euiButtonEmpty').contains('View all agent policies').click();

    navigateToEnrollmentTokens();
    cy.get('.euiTableCellContent').contains('Default policy');

    cy.visit('/app/integrations/installed');
    cy.getBySel('integration-card:epr:elastic_agent');
  });
});
