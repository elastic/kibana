/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  navigateTo,
  SECURITY_ROLES,
  SECURITY_USERS,
  FLEET,
  // loginAs,
  // loginWithUserAndWaitForPage,
  loginViaUi,
  logout,
  deleteRoleAndUser,
} from '../tasks/navigation';
// import type { User } from '../tasks/navigation';
import {
  CREATE_ROLE_BTN,
  ADD_KIBANA_PRIVILEGE,
  SPACE_SELECTOR_DROPDOWN,
  ALL_SPACES_OPTION,
  FEATURE_CATEGORY_MANAGEMENT,
  FLEET_PRIVILEGE_ALL_BTN,
  ROLE_NAME_INPUT,
  SAVE_ROLE_BTN,
  CREATE_USER_BTN,
  USERNAME_INPUT,
  PASSWORD_INPUT,
  FULLNAME_INPUT,
  CONFIRM_PASSWORD_INPUT,
  SELECT_ROLES_DROPDOWN,
  CREATE_PRIVILEGE_BTN,
} from '../screens/navigation';
import { MISSING_PRIVILEGES_PROMPT } from '../screens/fleet';

export const createRole = (roleName: string) => {
  navigateTo(SECURITY_ROLES);

  cy.getBySel(CREATE_ROLE_BTN).click();
  cy.getBySel(ADD_KIBANA_PRIVILEGE).click();

  cy.getBySel(SPACE_SELECTOR_DROPDOWN).click();
  cy.get(ALL_SPACES_OPTION).click();
  cy.getBySel(FEATURE_CATEGORY_MANAGEMENT).click();
  cy.getBySel(FLEET_PRIVILEGE_ALL_BTN).click({ force: true });
  cy.getBySel(CREATE_PRIVILEGE_BTN).click();

  cy.get(ROLE_NAME_INPUT).type(roleName);
  cy.getBySel(SAVE_ROLE_BTN).click();
};

export const createUser = (roleName: string, userName: string) => {
  navigateTo(SECURITY_USERS);

  cy.getBySel(CREATE_USER_BTN).click();
  cy.getBySel(USERNAME_INPUT).type(userName);
  cy.getBySel(FULLNAME_INPUT).type(userName);
  cy.getBySel(PASSWORD_INPUT).type('changeme');
  cy.getBySel(CONFIRM_PASSWORD_INPUT).type('changeme');
  cy.getBySel(SELECT_ROLES_DROPDOWN).click();

  cy.contains('div', roleName).click();
  cy.contains('button', 'Create user').click();
};

describe('When the user  has All privilege for Fleet but None for integrations', () => {
  before(() => {
    createRole('fleetAllIntNone');
    // createUser('fleetAllIntNone', 'UserWithNoFleetAccess');
    cy.wait(10000);
    // logout();
  });

  // afterEach(() => {
  //   deleteRoleAndUser('fleetAllIntNone');
  // });

  it('Fleet access is blocked', () => {
    logout();
    cy.wait(10000);
    //  login with new user
    // loginAs({ username: 'UserWithNoFleetAccess', password: 'changeme' });
    // loginWithUserAndWaitForPage('/app/security/cases', user);
    const user = { username: 'UserWithNoFleetAccess', password: 'changeme' };

    loginViaUi(user);
    navigateTo(FLEET);
    cy.get(MISSING_PRIVILEGES_PROMPT).contains('You are not authorized to access Fleet');
  });
});
