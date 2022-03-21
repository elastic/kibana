/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSPECT_MODAL } from '../../screens/inspect';
import { ALL_USERS_TABLE } from '../../screens/users/all_users';

import { clickInspectButton, closesModal } from '../../tasks/inspect';
import { login, visit } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Inspect', () => {
  context('Users stats and tables', () => {
    before(() => {
      login();
      visit(USERS_URL);
    });
    afterEach(() => {
      closesModal();
    });

    it(`inspects all users table`, () => {
      clickInspectButton(ALL_USERS_TABLE);
      cy.get(INSPECT_MODAL).should('be.visible');
    });
  });
});
