/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_POLICIES_TAB,
  ENROLLMENT_TOKENS_TAB,
  ADD_AGENT_BUTTON_TOP,
  CREATE_POLICY_BUTTON,
  AGENT_FLYOUT_CLOSE_BUTTON,
  STANDALONE_TAB,
} from '../screens/fleet';

export function createAgentPolicy() {
  cy.getBySel(ADD_AGENT_BUTTON_TOP).click();
  cy.getBySel(STANDALONE_TAB).click();
  cy.getBySel(CREATE_POLICY_BUTTON).click();
  cy.getBySel(AGENT_FLYOUT_CLOSE_BUTTON).click();
}

export function navigateToTab(tab: string) {
  cy.getBySel(tab).click();
  cy.get('.euiBasicTable-loading').should('not.exist');
}

export function navigateToAgentPolicy(name: string) {
  cy.get('.euiLink').contains(name).click();
  cy.get('.euiLoadingSpinner').should('not.exist');
}

export function navigateToEnrollmentTokens() {
  cy.getBySel(ENROLLMENT_TOKENS_TAB).click();
  cy.get('.euiBasicTable-loading').should('not.exist');
  cy.get('.euiButtonIcon--danger'); // wait for trash icon
}

export function verifyPolicy(name: string, integrations: string[]) {
  navigateToTab(AGENT_POLICIES_TAB);

  navigateToAgentPolicy(name);
  integrations.forEach((integration) => {
    cy.get('.euiLink').contains(integration);
  });

  cy.get('.euiButtonEmpty').contains('View all agent policies').click();

  navigateToEnrollmentTokens();

  cy.get('.euiTableCellContent').contains(name);
}

export function verifyAgentPackage() {
  cy.visit('/app/integrations/installed');
  cy.getBySel('integration-card:epr:elastic_agent');
}
