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
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

import { login, visit } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Authentications stats and tables', () => {
  before(() => {
    esArchiverLoad('users');
    login();
    visit(USERS_URL);
  });
  after(() => {
    esArchiverUnload('users');
  });

  it(`renders all authentications`, () => {
    const totalUsers = 1;
    const usersPerPage = 10;

    cy.get(AUTHENTICATIONS_TAB).click();

    cy.get(AUTHENTICATIONS_TABLE)
      .find(HEADER_SUBTITLE)
      .should('have.text', `Showing: ${totalUsers} user`);
    cy.get(USER_NAME_CELL).should('have.length', usersPerPage);
  });
});
