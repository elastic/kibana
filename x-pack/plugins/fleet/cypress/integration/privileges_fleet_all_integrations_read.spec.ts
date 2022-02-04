/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET } from '../tasks/navigation';
import {
  createUsersAndRoles,
  FleetAllIntegrReadRole,
  FleetAllIntegrReadUser,
  deleteUsersAndRoles,
} from '../tasks/privileges';
import { loginWithUserAndWaitForPage, logout } from '../tasks/login';

import {
  FLEET_SERVER_MISSING_PRIVILEGES_TITLE,
  FLEET_SERVER_MISSING_PRIVILEGES_MESSAGE,
  FLEET_AGENT_POLICIES_TAB,
} from '../screens/fleet';
const rolesToCreate = [FleetAllIntegrReadRole];
const usersToCreate = [FleetAllIntegrReadUser];

describe('When the user has All privilege for Fleet but Read for integrations', () => {
  before(() => {
    createUsersAndRoles(usersToCreate, rolesToCreate);
  });

  after(() => {
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
    logout();
  });

  it('If fleet server is not set up, Fleet shows a callout', () => {
    loginWithUserAndWaitForPage(FLEET, FleetAllIntegrReadUser);
    cy.getBySel(FLEET_SERVER_MISSING_PRIVILEGES_TITLE).should('have.text', 'Permission denied');
    cy.getBySel(FLEET_SERVER_MISSING_PRIVILEGES_MESSAGE).should(
      'contain',
      'Fleet Server needs to be set up.'
    );
    // cy.getBySel(FLEET_AGENT_POLICIES_TAB).click();
  });
});
