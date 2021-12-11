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

describe('Add Integration', () => {
  const integration = 'Apache';

  describe('Real API', () => {
    afterEach(() => {
      deleteIntegrations(integration);
    });
    it('should display Apache integration in the Policies list once installed ', () => {
      addAndVerifyIntegration();
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

  function addAndVerifyIntegration() {
    cy.intercept('GET', '/api/fleet/epm/packages?*').as('packages');
    navigateTo(INTEGRATIONS);
    cy.wait('@packages');
    cy.get('.euiLoadingSpinner').should('not.exist');
    cy.get('input[placeholder="Search for integrations"]').type('Apache');
    cy.get(INTEGRATIONS_CARD).contains(integration).click();
    addIntegration();
    cy.getBySel(INTEGRATION_NAME_LINK).contains('apache-');
  }

  it.skip('[Mocked requests] should display Apache integration in the Policies list once installed ', () => {
    cy.intercept('POST', '/api/fleet/package_policies', {
      fixture: 'integrations/create_integration_response.json',
    });
    cy.intercept(
      'GET',
      '/api/fleet/package_policies?page=1&perPage=20&kuery=ingest-package-policies.package.name%3A%20apache',
      { fixture: 'integrations/list.json' }
    );
    cy.intercept('GET', '/api/fleet/agent_policies?*', {
      fixture: 'integrations/agent_policies.json',
    });
    cy.intercept('GET', '/api/fleet/agent_policies/30e16140-2106-11ec-a289-25321523992d', {
      fixture: 'integrations/agent_policy.json',
    });
    // TODO fixture includes 1 package policy, should be empty initially
    cy.intercept('GET', '/api/fleet/epm/packages/apache/1.1.0', {
      fixture: 'integrations/apache.json',
    });
    addAndVerifyIntegration();
  });
});
