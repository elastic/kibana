/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AUTHENTICATIONS_TAB,
  AUTHENTICATIONS_TABLE,
  HEADER_SUBTITLE,
  USER_NAME_CELL,
} from '../../screens/users/user_authentications';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Authentications stats and tables', () => {
  before(() => {
    cleanKibana();

    loginAndWaitForPage(USERS_URL);
  });

  it(`renders all authentications`, () => {
    const totalUsers = 35;
    const usersPerPage = 10;

    cy.get(AUTHENTICATIONS_TAB).click();

    cy.get(AUTHENTICATIONS_TABLE)
      .find(HEADER_SUBTITLE)
      .should('have.text', `Showing: ${totalUsers} users`);
    cy.get(USER_NAME_CELL).should('have.length', usersPerPage);
  });
});
