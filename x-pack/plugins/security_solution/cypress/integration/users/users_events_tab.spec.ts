/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENTS_TAB, EVENTS_TAB_CONTENT } from '../../screens/users/user_events';
import { login, visit } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Users Events tab', () => {
  before(() => {
    login();
    visit(USERS_URL);
  });

  it(`renders events tab`, () => {
    cy.get(EVENTS_TAB).click({ force: true });

    cy.get(EVENTS_TAB_CONTENT).should('exist');
  });
});
