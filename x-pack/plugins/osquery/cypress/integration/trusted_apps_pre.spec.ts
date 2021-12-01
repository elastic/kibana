/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRUSTED_APPLICATIONS_FLYOUT_NAME_FIELD,
  TRUSTED_APPLICATIONS_FLYOUT_DESCRIPTION_FIELD,
  TRUSTED_APPLICATIONS_FLYOUT_CONDITIONS_BUILDER_FIELD,
  TRUSTED_APPLICATIONS_FLYOUT_CONDITIONS_BUILDER_FIELD_PATH_OPTION,
  TRUSTED_APPLICATIONS_FLYOUT_CONDITIONS_BUILDER_VALUE,
} from '../screens/trusted_apps';
import { FLEET_AGENT_POLICIES, navigateTo } from '../tasks/navigation';
import { goToTrustedApplicationsList } from '../tasks/trusted_apps';
import { login } from '../tasks/login';
import {
  ADD_POLICY_BTN,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  DATA_COLLECTION_SETUP_STEP,
  PACKAGE_POLICY_NAME_INPUT,
  PACKAGE_POLICY_DESCRIPTION_INPUT,
} from '../screens/integrations';
import { closeModalIfVisible } from '../tasks/integrations';

const INTEGRATION_PACKAGE_NAME = 'Endpoint Security';

const AGENT_POLICY_NAME = 'Agent policy from automation';

const INTEGRATION_PACKAGE_POLICY_NAME = 'Endpoint integration';

describe('Configure trusted apps before upgrade', () => {
  before(() => {
    login();
    addAndVerifyAgentPolicy();
  });

  it('Add legacy trusted app', () => {
    addAndVerifyIntegration();
    goToTrustedApplicationsList();

    // add check if trusted app exists
    cy.contains('Add trusted application').click();
    cy.getBySel(TRUSTED_APPLICATIONS_FLYOUT_NAME_FIELD).type('Trusted app from automation');
    cy.getBySel(TRUSTED_APPLICATIONS_FLYOUT_DESCRIPTION_FIELD).type(
      'Trusted app created from the automation framework'
    );
    cy.getBySel(TRUSTED_APPLICATIONS_FLYOUT_CONDITIONS_BUILDER_FIELD).click();
    cy.get(TRUSTED_APPLICATIONS_FLYOUT_CONDITIONS_BUILDER_FIELD_PATH_OPTION).click();
    cy.getBySel(TRUSTED_APPLICATIONS_FLYOUT_CONDITIONS_BUILDER_VALUE).type('testPath');
    cy.get('.euiFlyoutFooter').contains('Add trusted application').click();
  });

  function addAndVerifyAgentPolicy() {
    navigateTo(FLEET_AGENT_POLICIES);

    cy.contains('Loading agent policies').should('exist');
    cy.contains('Loading agent policies').should('not.exist');

    cy.get('body').then((body) => {
      if (!body.find(`[title="${AGENT_POLICY_NAME}"]`).length) {
        cy.contains('Create agent policy').click();
        cy.get('input[placeholder="Choose a name"]').type(AGENT_POLICY_NAME);
        cy.get('input[placeholder="How will this policy be used?"]').type(
          'This is a policy created from the automation framework'
        );
        cy.get('.euiFlyoutFooter').contains('Create agent policy').click();
        cy.get('.euiFlyoutBody').should('not.exist');
        cy.contains(AGENT_POLICY_NAME);
      }
    });
  }

  function addAndVerifyIntegration() {
    navigateTo(FLEET_AGENT_POLICIES);
    cy.contains(AGENT_POLICY_NAME).click();

    cy.contains(AGENT_POLICY_NAME).should('exist');

    cy.get('body').then((body) => {
      if (!body.find(`[title="${INTEGRATION_PACKAGE_POLICY_NAME}"]`).length) {
        cy.contains('Add integration').click();
        cy.contains(INTEGRATION_PACKAGE_NAME).click();
        addIntegration();
        cy.contains(INTEGRATION_PACKAGE_POLICY_NAME);
      }
    });
  }

  function addIntegration() {
    cy.getBySel(ADD_POLICY_BTN).click();
    cy.getBySel(DATA_COLLECTION_SETUP_STEP).find('.euiLoadingSpinner').should('not.exist');
    // Endpoint integration
    // cy.getBySel(CONFIRM_MODAL_BTN).click();
    cy.getBySel(PACKAGE_POLICY_NAME_INPUT).clear().type(INTEGRATION_PACKAGE_POLICY_NAME);
    cy.getBySel(PACKAGE_POLICY_DESCRIPTION_INPUT).type(
      'Endpoint integration from automation framework'
    );

    cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
    // sometimes agent is assigned to default policy, sometimes not
    closeModalIfVisible();

    // cy.contains('Add Elastic Agent later').click();

    cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN, { timeout: 60000 }).should('not.exist');
  }
});
