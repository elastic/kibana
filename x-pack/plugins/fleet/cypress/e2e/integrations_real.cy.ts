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
  FLYOUT_CLOSE_BTN_SEL,
  getIntegrationCard,
  INTEGRATION_NAME_LINK,
  LATEST_VERSION,
  PACKAGE_VERSION,
  POLICIES_TAB,
  SETTINGS_TAB,
  UPDATE_PACKAGE_BTN,
  INTEGRATIONS_SEARCHBAR,
  SETTINGS,
  INTEGRATION_POLICIES_UPGRADE_CHECKBOX,
  INTEGRATION_LIST,
  getIntegrationCategories,
} from '../screens/integrations';
import { LOADING_SPINNER, CONFIRM_MODAL } from '../screens/navigation';
import { ADD_PACKAGE_POLICY_BTN } from '../screens/fleet';
import { cleanupAgentPolicies } from '../tasks/cleanup';

function setupIntegrations() {
  cy.intercept(
    '/api/fleet/epm/packages?*',
    {
      middleware: true,
    },
    (req) => {
      req.on('before:response', (res) => {
        // force all API responses to not be cached
        res.headers['cache-control'] = 'no-store';
      });
    }
  ).as('packages');

  navigateTo(INTEGRATIONS);
  cy.wait('@packages');
}

it('should install integration without policy', () => {
  cy.visit('/app/integrations/detail/tomcat/settings');

  cy.getBySel(SETTINGS.INSTALL_ASSETS_BTN).click();
  cy.get('.euiCallOut').contains('This action will install 1 assets');
  cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

  cy.getBySel(LOADING_SPINNER).should('not.exist');

  cy.getBySel(SETTINGS.UNINSTALL_ASSETS_BTN).click();
  cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();
  cy.getBySel(LOADING_SPINNER).should('not.exist');
  cy.getBySel(SETTINGS.INSTALL_ASSETS_BTN).should('exist');
});

describe('Add Integration - Real API', () => {
  const integration = 'apache';

  after(() => {
    deleteIntegrations();
  });

  afterEach(() => {
    cleanupAgentPolicies();
  });

  it('should install integration without policy', () => {
    cy.visit('/app/integrations/detail/tomcat/settings');

    cy.getBySel(SETTINGS.INSTALL_ASSETS_BTN).click();
    cy.get('.euiCallOut').contains('This action will install 1 assets');
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

    cy.getBySel(LOADING_SPINNER).should('not.exist');

    cy.getBySel(SETTINGS.UNINSTALL_ASSETS_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();
    cy.getBySel(LOADING_SPINNER).should('not.exist');
    cy.getBySel(SETTINGS.INSTALL_ASSETS_BTN).should('exist');
  });

  it('should display Apache integration in the Policies list once installed ', () => {
    setupIntegrations();
    cy.getBySel(LOADING_SPINNER).should('not.exist');
    cy.getBySel(INTEGRATIONS_SEARCHBAR.INPUT).clear().type('Apache');
    cy.getBySel(getIntegrationCard(integration)).click();
    addIntegration();
    cy.getBySel(INTEGRATION_NAME_LINK).contains('apache-1');
    cy.getBySel(AGENT_POLICY_NAME_LINK).contains('Agent policy 1');
  });

  it('should add integration to policy', () => {
    const agentPolicyId = 'policy_1';
    cy.request({
      method: 'POST',
      url: `/api/fleet/agent_policies`,
      body: {
        id: `${agentPolicyId}`,
        name: 'Agent policy 1',
        description: 'desc',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
      },
      headers: { 'kbn-xsrf': 'cypress' },
    });

    cy.request('/api/fleet/agent_policies').then((response: any) => {
      cy.visit(`/app/fleet/policies/${agentPolicyId}`);

      cy.intercept(
        '/api/fleet/epm/packages?*',
        {
          middleware: true,
        },
        (req) => {
          req.on('before:response', (res) => {
            // force all API responses to not be cached
            res.headers['cache-control'] = 'no-store';
          });
        }
      ).as('packages');

      cy.getBySel(ADD_PACKAGE_POLICY_BTN).click();
      cy.wait('@packages');
      cy.getBySel(LOADING_SPINNER).should('not.exist');
      cy.getBySel(INTEGRATIONS_SEARCHBAR.INPUT).clear().type('Apache');
      cy.getBySel(getIntegrationCard(integration)).click();
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

    addIntegration();

    cy.getBySel(INTEGRATION_NAME_LINK).contains('apache-');
    cy.getBySel(PACKAGE_VERSION).contains(oldVersion);

    clickIfVisible(FLYOUT_CLOSE_BTN_SEL);

    cy.getBySel(SETTINGS_TAB).click();
    cy.getBySel(UPDATE_PACKAGE_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

    cy.getBySel(LATEST_VERSION).then(($title) => {
      const newVersion = $title.text();
      cy.getBySel(INTEGRATION_POLICIES_UPGRADE_CHECKBOX).should('not.exist');
      cy.getBySel(POLICIES_TAB).click();
      cy.getBySel(PACKAGE_VERSION).contains(oldVersion).should('not.exist');
      cy.getBySel(PACKAGE_VERSION).contains(newVersion);
    });
  });

  it('should filter integrations by category', () => {
    setupIntegrations();
    cy.getBySel(getIntegrationCategories('aws')).click();
    cy.getBySel(INTEGRATIONS_SEARCHBAR.BADGE).contains('AWS').should('exist');
    cy.getBySel(INTEGRATION_LIST).find('.euiCard').should('have.length.greaterThan', 29);

    cy.getBySel(INTEGRATIONS_SEARCHBAR.INPUT).clear().type('Cloud');
    cy.getBySel(INTEGRATION_LIST).find('.euiCard').should('have.length.greaterThan', 3);
    cy.getBySel(INTEGRATIONS_SEARCHBAR.REMOVE_BADGE_BUTTON).click();
    cy.getBySel(INTEGRATIONS_SEARCHBAR.BADGE).should('not.exist');
  });
});
