/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTEGRATIONS } from '../tasks/navigation';
import {
  createUsersAndRoles,
  FleetNoneIntegrAllRole,
  FleetNoneIntegrAllUser,
  deleteUsersAndRoles,
} from '../tasks/privileges';
import { loginWithUserAndWaitForPage, logout } from '../tasks/login';

import { ADD_POLICY_BTN } from '../screens/integrations';

const rolesToCreate = [FleetNoneIntegrAllRole];
const usersToCreate = [FleetNoneIntegrAllUser];

describe('When the user has All privileges for Integrations but None for for Fleet', () => {
  before(() => {
    createUsersAndRoles(usersToCreate, rolesToCreate);
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
  });

  it('Integrations are visible but cannot be added', () => {
    loginWithUserAndWaitForPage(INTEGRATIONS, FleetNoneIntegrAllUser);
    cy.getBySel('integration-card:epr:apache').click();
    cy.getBySel(ADD_POLICY_BTN).should('be.disabled');
  });
});
