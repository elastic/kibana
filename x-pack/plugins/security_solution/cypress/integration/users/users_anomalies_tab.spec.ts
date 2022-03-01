/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANOMALIES_TAB, ANOMALIES_TAB_CONTENT } from '../../screens/users/user_anomalies';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Users anomalies tab', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPage(USERS_URL);
  });

  it(`renders anomalies tab`, () => {
    cy.get(ANOMALIES_TAB).click();

    cy.get(ANOMALIES_TAB_CONTENT).should('exist');
  });
});
