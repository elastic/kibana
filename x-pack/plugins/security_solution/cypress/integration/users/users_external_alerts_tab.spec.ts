/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXTERNAL_ALERTS_TAB,
  EXTERNAL_ALERTS_TAB_CONTENT,
} from '../../screens/users/user_external_alerts';

import { login, visit } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Users external alerts tab', () => {
  before(() => {
    login();
    visit(USERS_URL);
  });

  it(`renders external alerts tab`, () => {
    cy.get(EXTERNAL_ALERTS_TAB).click({ force: true });

    cy.get(EXTERNAL_ALERTS_TAB_CONTENT).should('exist');
  });
});
