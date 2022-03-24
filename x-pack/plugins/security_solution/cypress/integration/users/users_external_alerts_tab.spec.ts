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
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Users external alerts tab', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPage(USERS_URL);
  });

  it(`renders external alerts tab`, () => {
    cy.get(EXTERNAL_ALERTS_TAB).click();

    cy.get(EXTERNAL_ALERTS_TAB_CONTENT).should('exist');
  });
});
