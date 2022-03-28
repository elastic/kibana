/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HEADER_SUBTITLE, USER_NAME_CELL } from '../../screens/users/all_users';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Users stats and tables', () => {
  before(() => {
    cleanKibana();

    loginAndWaitForPage(USERS_URL);
  });

  it(`renders all users`, () => {
    const totalUsers = 72;
    const usersPerPage = 10;

    cy.get(HEADER_SUBTITLE).should('have.text', `Showing: ${totalUsers} users`);
    cy.get(USER_NAME_CELL).should('have.length', usersPerPage);
  });
});
