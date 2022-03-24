/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENTS_TAB, EVENTS_TAB_CONTENT } from '../../screens/users/user_events';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Users Events tab', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPage(USERS_URL);
  });

  it(`renders events tab`, () => {
    cy.get(EVENTS_TAB).click();

    cy.get(EVENTS_TAB_CONTENT).should('exist');
  });
});
