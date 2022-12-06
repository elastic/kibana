/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_FLYOUT,
  AGENT_POLICIES_TAB,
  ENROLLMENT_TOKENS_TAB,
  ADD_AGENT_BUTTON_TOP,
  PACKAGE_POLICY_TABLE_LINK,
  API_KEYS,
} from '../screens/fleet';
import { LOADING_SPINNER } from '../screens/navigation';
import { getIntegrationCard } from '../screens/integrations';

export function createAgentPolicy() {
  cy.intercept({
    url: '/api/fleet/agent_policies?sys_monitoring=true',
    method: 'POST',
  }).as('postAgentPolicy');
  cy.getBySel(ADD_AGENT_BUTTON_TOP).click();
  cy.getBySel(AGENT_FLYOUT.STANDALONE_TAB).click();
  cy.getBySel(AGENT_FLYOUT.CREATE_POLICY_BUTTON).click();

  cy.wait('@postAgentPolicy');
  cy.getBySel(AGENT_FLYOUT.CLOSE_BUTTON).click();
}

export function navigateToTab(tab: string) {
  cy.getBySel(tab).click();
  cy.get('.euiBasicTable-loading').should('not.exist');
}

export function navigateToAgentPolicy(name: string) {
  cy.get('.euiLink').contains(name).click();
  cy.getBySel(LOADING_SPINNER).should('not.exist');
}

export function navigateToEnrollmentTokens() {
  cy.getBySel(ENROLLMENT_TOKENS_TAB).click();
  cy.get('.euiBasicTable-loading').should('not.exist');
  cy.getBySel(API_KEYS.REVOKE_KEY_BUTTON); // wait for trash icon
}

export function verifyPolicy(name: string, integrations: string[]) {
  navigateToTab(AGENT_POLICIES_TAB);

  navigateToAgentPolicy(name);
  integrations.forEach((integration) => {
    cy.getBySel(PACKAGE_POLICY_TABLE_LINK).contains(integration);
  });

  cy.get('.euiButtonEmpty').contains('View all agent policies').click();

  navigateToEnrollmentTokens();

  cy.get('.euiTableCellContent').contains(name);
}

export function verifyAgentPackage() {
  cy.visit('/app/integrations/installed');
  cy.getBySel(getIntegrationCard('elastic_agent'));
}
