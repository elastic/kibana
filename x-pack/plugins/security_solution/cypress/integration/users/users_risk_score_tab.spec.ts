/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_SCORE_TAB_CONTENT, RISK_SCORE_TAB } from '../../screens/users/user_risk_score';

import { login, visit } from '../../tasks/login';

import { USERS_URL } from '../../urls/navigation';

describe('Users risk tab', () => {
  before(() => {
    login();
    visit(USERS_URL);
  });

  it(`renders users risk tab`, () => {
    cy.get(RISK_SCORE_TAB).click();

    cy.get(RISK_SCORE_TAB_CONTENT).should('exist');
  });
});
