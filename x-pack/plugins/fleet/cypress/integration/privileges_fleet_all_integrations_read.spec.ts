/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET, INTEGRATIONS, navigateTo } from '../tasks/navigation';
import {
  createUsersAndRoles,
  FleetAllIntegrReadRole,
  FleetAllIntegrReadUser,
  deleteUsersAndRoles,
} from '../tasks/privileges';
import { loginWithUserAndWaitForPage, logout } from '../tasks/login';
import { navigateToTab, createAgentPolicy } from '../tasks/fleet';
import { cleanupAgentPolicies, unenrollAgent } from '../tasks/cleanup';

import {
  FLEET_SERVER_MISSING_PRIVILEGES_TITLE,
  FLEET_SERVER_MISSING_PRIVILEGES_MESSAGE,
  ADD_AGENT_BUTTON_TOP,
  AGENT_POLICIES_TAB,
  AGENT_POLICY_SAVE_INTEGRATION,
  ADD_PACKAGE_POLICY_BTN,
} from '../screens/fleet';
import { ADD_POLICY_BTN, AGENT_POLICY_NAME_LINK } from '../screens/integrations';

const rolesToCreate = [FleetAllIntegrReadRole];
const usersToCreate = [FleetAllIntegrReadUser];

describe('When the user has All privilege for Fleet but Read for integrations', () => {
  before(() => {
    createUsersAndRoles(usersToCreate, rolesToCreate);
  });

  after(() => {
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
  });

  afterEach(() => {
    logout();
  });

  describe('When there are agent policies', () => {
    before(() => {
      navigateTo(FLEET);
      createAgentPolicy();
    });

    it('Some elements in the UI are not enabled', () => {
      logout();
      loginWithUserAndWaitForPage(FLEET, FleetAllIntegrReadUser);
      navigateToTab(AGENT_POLICIES_TAB);

      cy.getBySel(AGENT_POLICY_NAME_LINK).click();
      cy.getBySel(ADD_PACKAGE_POLICY_BTN).should('be.disabled');

      cy.get('a[title="system-1"]').click();
      cy.getBySel(AGENT_POLICY_SAVE_INTEGRATION).should('be.disabled');
    });

    after(() => {
      unenrollAgent();
      cleanupAgentPolicies();
    });
  });

  describe('When there are no agent policies', () => {
    it('If fleet server is not set up, Fleet shows a callout', () => {
      loginWithUserAndWaitForPage(FLEET, FleetAllIntegrReadUser);
      cy.getBySel(FLEET_SERVER_MISSING_PRIVILEGES_TITLE).should('have.text', 'Permission denied');
      cy.getBySel(FLEET_SERVER_MISSING_PRIVILEGES_MESSAGE).should(
        'contain',
        'Fleet Server needs to be set up.'
      );
      cy.getBySel(ADD_AGENT_BUTTON_TOP).should('not.be.disabled');
    });
  });

  describe('Integrations', () => {
    it('are visible but cannot be added', () => {
      loginWithUserAndWaitForPage(INTEGRATIONS, FleetAllIntegrReadUser);
      cy.getBySel('integration-card:epr:apache').click();
      cy.getBySel(ADD_POLICY_BTN).should('be.disabled');
    });
  });
});
