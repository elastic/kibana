/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HEADER_SUBTITLE, USER_NAME_CELL } from '../../screens/users/all_users';
import { cleanKibana } from '../../tasks/common';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

import { login, visit } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Users stats and tables', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('users');
    login();
    visit(USERS_URL);
  });
  after(() => {
    esArchiverUnload('users');
  });

  it(`renders all users`, () => {
    const totalUsers = 1;
    const usersPerPage = 1;

    cy.get(HEADER_SUBTITLE).should('have.text', `Showing: ${totalUsers} user`);
    cy.get(USER_NAME_CELL).should('have.length', usersPerPage);
  });
});
