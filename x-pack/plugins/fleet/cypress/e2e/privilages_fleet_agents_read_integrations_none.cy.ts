/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET } from '../tasks/navigation';
import {
  deleteUsers,
  FleetAgentsReadIntegrNoneRole,
  FleetAgentsReadIntegrNoneUser,
  createUsersAndRoles,
} from '../tasks/privileges';
import { login, loginWithUserAndWaitForPage, logout } from '../tasks/login';

import {
  MISSING_PRIVILEGES,
  AGENTS_TAB,
  ADD_AGENT_BUTTON,
  ADD_FLEET_SERVER_HEADER,
  AGENT_POLICIES_TAB,
  SETTINGS_TAB,
  UNINSTALL_TOKENS_TAB,
} from '../screens/fleet';

import { navigateToTab } from '../tasks/fleet';

const rolesToCreate = [FleetAgentsReadIntegrNoneRole];
const usersToCreate = [FleetAgentsReadIntegrNoneUser];

describe('When the user has Fleet Agents Read built-in role', () => {
  before(() => {
    createUsersAndRoles(usersToCreate, rolesToCreate);
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
      loginWithUserAndWaitForPage(FLEET, FleetAgentsReadIntegrNoneUser);
      cy.getBySel(AGENTS_TAB).should('exist');
      cy.getBySel(MISSING_PRIVILEGES.TITLE).should('not.exist');
      cy.getBySel(ADD_AGENT_BUTTON).should('not.exist');
      cy.getBySel(ADD_FLEET_SERVER_HEADER).should('not.exist');
    });

    it('is accessible and user only see agents tab', () => {
      loginWithUserAndWaitForPage(FLEET, FleetAgentsReadIntegrNoneUser);

      cy.getBySel(AGENTS_TAB).should('exist');
      cy.getBySel(AGENT_POLICIES_TAB).should('not.exist');
      cy.getBySel(SETTINGS_TAB).should('not.exist');
      cy.getBySel(UNINSTALL_TOKENS_TAB).should('not.exist');
    });
  });
});
