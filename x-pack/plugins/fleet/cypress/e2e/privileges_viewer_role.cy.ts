/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginWithUserAndWaitForPage, logout } from '../tasks/login';
import { FLEET, INTEGRATIONS } from '../tasks/navigation';
import { BuiltInViewerUser, createUsers, deleteUsers } from '../tasks/privileges';

import { getIntegrationCard } from '../screens/integrations';

import {
  ADD_AGENT_BUTTON,
  ADD_AGENT_POLICY_BTN,
  ADD_FLEET_SERVER_HEADER,
  AGENTS_TAB,
  AGENT_POLICIES_TAB,
  MISSING_PRIVILEGES,
  SETTINGS_FLEET_SERVER_HOSTS,
  SETTINGS_OUTPUTS,
  SETTINGS_TAB,
} from '../screens/fleet';
import { ADD_INTEGRATION_POLICY_BTN } from '../screens/integrations';
import { navigateToTab } from '../tasks/fleet';
import { scrollToIntegration } from '../tasks/integrations';

const usersToCreate = [BuiltInViewerUser];

// This role behaves like Fleet -> None, Integrations -> Read
describe('When the user has Viewer built-in role', () => {
  before(() => {
    createUsers(usersToCreate);
  });

  beforeEach(() => {
    login();
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsers(usersToCreate);
  });

  describe('Fleet', () => {
    it('is accessible but user cannot perform any write actions on agent tabs', () => {
      loginWithUserAndWaitForPage(FLEET, BuiltInViewerUser);
      cy.getBySel(AGENTS_TAB).should('exist');
      cy.getBySel(MISSING_PRIVILEGES.TITLE).should('not.exist');
      cy.getBySel(ADD_AGENT_BUTTON).should('not.exist');
      cy.getBySel(ADD_FLEET_SERVER_HEADER).should('not.exist');
    });

    it('is accessible but user cannot perform any write actions on agent policies tabs', () => {
      loginWithUserAndWaitForPage(FLEET, BuiltInViewerUser);
      navigateToTab(AGENT_POLICIES_TAB);

      // Not write actions
      cy.getBySel(ADD_AGENT_POLICY_BTN).should('not.be.enabled');
    });

    it('is accessible but user cannot perform any write actions on settings tabs', () => {
      loginWithUserAndWaitForPage(FLEET, BuiltInViewerUser);
      navigateToTab(SETTINGS_TAB);

      // Not write actions
      cy.getBySel(SETTINGS_OUTPUTS.ADD_BTN).should('not.exist');
      cy.getBySel(SETTINGS_FLEET_SERVER_HOSTS.ADD_BUTTON).should('not.exist');
    });
  });

  describe('Integrations', () => {
    it('are visible but cannot be added', () => {
      loginWithUserAndWaitForPage(INTEGRATIONS, BuiltInViewerUser);
      scrollToIntegration(getIntegrationCard('apache'));
      cy.getBySel(getIntegrationCard('apache')).click();
      cy.getBySel(ADD_INTEGRATION_POLICY_BTN).should('be.disabled');
    });
  });
});
