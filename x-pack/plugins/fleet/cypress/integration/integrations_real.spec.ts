/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTEGRATIONS, navigateTo } from '../tasks/navigation';
import {
  addIntegration,
  installPackageWithVersion,
  deleteIntegrations,
  clickIfVisible,
} from '../tasks/integrations';
import {
  AGENT_POLICY_NAME_LINK,
  CONFIRM_MODAL_BTN,
  FLYOUT_CLOSE_BTN_SEL,
  INTEGRATIONS_CARD,
  INTEGRATION_NAME_LINK,
  LATEST_VERSION,
  PACKAGE_VERSION,
  POLICIES_TAB,
  SETTINGS_TAB,
  UPDATE_PACKAGE_BTN,
} from '../screens/integrations';
import { ADD_PACKAGE_POLICY_BTN } from '../screens/fleet';
import { cleanupAgentPolicies } from '../tasks/cleanup';

describe('Add Integration - Real API', () => {
  const integration = 'Apache';

  after(() => {
    cleanupAgentPolicies();
  });

  it('should install integration without policy', () => {
    cy.visit('/app/integrations/detail/tomcat/settings');

    cy.get('.euiButton').contains('Install Apache Tomcat assets').click();
    cy.get('.euiCallOut').contains('This action will install 1 assets');
    cy.getBySel(CONFIRM_MODAL_BTN).click();

    cy.get('.euiLoadingSpinner').should('not.exist');

    cy.get('.euiButton').contains('Uninstall Apache Tomcat').click();
    cy.getBySel(CONFIRM_MODAL_BTN).click();
    cy.get('.euiLoadingSpinner').should('not.exist');
    cy.get('.euiButton').contains('Install Apache Tomcat assets');
  });

  function addAndVerifyIntegration() {
    cy.intercept('GET', '/api/fleet/epm/packages?*').as('packages');
    navigateTo(INTEGRATIONS);
    cy.wait('@packages');
    cy.get('.euiLoadingSpinner').should('not.exist');
    cy.get('input[placeholder="Search for integrations"]').type('Apache');
    cy.get(INTEGRATIONS_CARD).contains(integration).click();
    addIntegration();
    cy.getBySel(INTEGRATION_NAME_LINK).contains('apache-1');
  }

  afterEach(() => {
    deleteIntegrations(integration);
  });
  it('should display Apache integration in the Policies list once installed ', () => {
    addAndVerifyIntegration();
    cy.getBySel(AGENT_POLICY_NAME_LINK).contains('Agent policy 1');
  });

  it('should add integration to policy', () => {
    cy.request('/api/fleet/agent_policies').then((response: any) => {
      const agentPolicyId = response.body.items
        .filter((policy: any) => policy.name === 'Agent policy 1')
        .map((policy: any) => policy.id);

      cy.visit(`/app/fleet/policies/${agentPolicyId}`);
      cy.intercept('GET', '/api/fleet/epm/packages?*').as('packages');
      cy.getBySel(ADD_PACKAGE_POLICY_BTN).click();
      cy.wait('@packages');
      cy.get('.euiLoadingSpinner').should('not.exist');
      cy.get('input[placeholder="Search for integrations"]').type('Apache');
      cy.get(INTEGRATIONS_CARD).contains(integration).click();
      addIntegration({ useExistingPolicy: true });
      cy.get('.euiBasicTable-loading').should('not.exist');
      cy.get('.euiTitle').contains('Agent policy 1');
      clickIfVisible(FLYOUT_CLOSE_BTN_SEL);
      cy.get('.euiLink').contains('apache-1');
    });
  });

  it('should upgrade policies with integration update', () => {
    const oldVersion = '0.3.3';
    installPackageWithVersion('apache', oldVersion);
    navigateTo(`app/integrations/detail/apache-${oldVersion}/policies`);

    addIntegration({ useExistingPolicy: true });

    cy.getBySel(INTEGRATION_NAME_LINK).contains('apache-');
    cy.getBySel(PACKAGE_VERSION).contains(oldVersion);

    clickIfVisible(FLYOUT_CLOSE_BTN_SEL);

    cy.getBySel(SETTINGS_TAB).click();
    cy.getBySel(UPDATE_PACKAGE_BTN).click();
    cy.getBySel(CONFIRM_MODAL_BTN).click();

    cy.getBySel(LATEST_VERSION).then(($title) => {
      const newVersion = $title.text();
      cy.get('#upgradePoliciesCheckbox').should('not.exist');
      cy.getBySel(POLICIES_TAB).click();
      cy.getBySel(PACKAGE_VERSION).contains(oldVersion).should('not.exist');
      cy.getBySel(PACKAGE_VERSION).contains(newVersion);
    });
  });
});
