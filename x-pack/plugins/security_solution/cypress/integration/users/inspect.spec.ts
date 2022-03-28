/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATIONS_TABLE } from '../../screens/hosts/authentications';
import { INSPECT_MODAL } from '../../screens/inspect';
import { ALL_USERS_TABLE } from '../../screens/users/all_users';
import { AUTHENTICATIONS_TAB } from '../../screens/users/user_authentications';
import { cleanKibana } from '../../tasks/common';

import { clickInspectButton, closesModal } from '../../tasks/inspect';
import { loginAndWaitForPage } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Inspect', () => {
  before(() => {
    cleanKibana();
  });
  context('Users stats and tables', () => {
    before(() => {
      loginAndWaitForPage(USERS_URL);
    });
    afterEach(() => {
      closesModal();
    });

    it(`inspects all users table`, () => {
      clickInspectButton(ALL_USERS_TABLE);
      cy.get(INSPECT_MODAL).should('be.visible');
    });

    it(`inspects authentications table`, () => {
      cy.get(AUTHENTICATIONS_TAB).click();
      clickInspectButton(AUTHENTICATIONS_TABLE);
      cy.get(INSPECT_MODAL).should('be.visible');
    });
  });
});
