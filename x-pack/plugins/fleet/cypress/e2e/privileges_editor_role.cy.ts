/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET, INTEGRATIONS, navigateTo } from '../tasks/navigation';
import { createUsers, BuiltInEditorUser, deleteUsers } from '../tasks/privileges';
import { loginWithUserAndWaitForPage, logout } from '../tasks/login';

import { getIntegrationCard } from '../screens/integrations';

import {
  FLEET_SERVER_MISSING_PRIVILEGES,
  ADD_AGENT_BUTTON_TOP,
  AGENT_FLYOUT,
} from '../screens/fleet';
import { ADD_INTEGRATION_POLICY_BTN } from '../screens/integrations';
import { scrollToIntegration } from '../tasks/integrations';

const usersToCreate = [BuiltInEditorUser];

// This role behaves like Fleet > All, Integrations > All
describe('When the user has Editor built-in role', () => {
  before(() => {
    createUsers(usersToCreate);
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsers(usersToCreate);
  });

  describe('Fleet app', () => {
    before(() => {
      navigateTo(FLEET);
    });

    describe('When there are no agent policies', () => {
      it('If fleet server is not set up, Fleet shows a callout', () => {
        loginWithUserAndWaitForPage(FLEET, BuiltInEditorUser);
        cy.getBySel(FLEET_SERVER_MISSING_PRIVILEGES.MESSAGE).should(
          'contain',
          'Fleet Server needs to be set up.'
        );

        cy.getBySel(ADD_AGENT_BUTTON_TOP).click();
        cy.getBySel(AGENT_FLYOUT.MANAGED_TAB).click();
        cy.getBySel(FLEET_SERVER_MISSING_PRIVILEGES.PROMPT).should('exist');
      });
    });
  });

  describe('Integrations app', () => {
    it('are visible and can be added', () => {
      loginWithUserAndWaitForPage(INTEGRATIONS, BuiltInEditorUser);
      scrollToIntegration(getIntegrationCard('apache'));
      cy.getBySel(getIntegrationCard('apache')).click();
      cy.getBySel(ADD_INTEGRATION_POLICY_BTN).should('not.be.disabled');
    });
  });
});
