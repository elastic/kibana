/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HEADER_SUBTITLE, USER_NAME_CELL } from '../../screens/users/all_users';
import { ANOMALIES_TAB, ANOMALIES_TAB_CONTENT } from '../../screens/users/user_anomalies';
import {
  AUTHENTICATIONS_TAB,
  AUTHENTICATIONS_TABLE,
} from '../../screens/users/user_authentications';
import { EVENTS_TAB, EVENTS_TAB_CONTENT } from '../../screens/users/user_events';
import {
  EXTERNAL_ALERTS_TAB,
  EXTERNAL_ALERTS_TAB_CONTENT,
} from '../../screens/users/user_external_alerts';
import { RISK_SCORE_TAB, RISK_SCORE_TAB_CONTENT } from '../../screens/users/user_risk_score';
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

  it(`renders all authentications`, () => {
    const totalUsers = 1;
    const usersPerPage = 1;

    cy.get(AUTHENTICATIONS_TAB).click();

    cy.get(AUTHENTICATIONS_TABLE)
      .find(HEADER_SUBTITLE)
      .should('have.text', `Showing: ${totalUsers} user`);
    cy.get(USER_NAME_CELL).should('have.length', usersPerPage);
  });

  it(`renders anomalies tab`, () => {
    cy.get(ANOMALIES_TAB).click({ force: true });

    cy.get(ANOMALIES_TAB_CONTENT).should('exist');
  });

  it(`renders events tab`, () => {
    cy.get(EVENTS_TAB).click({ force: true });

    cy.get(EVENTS_TAB_CONTENT).should('exist');
  });

  it(`renders external alerts tab`, () => {
    cy.get(EXTERNAL_ALERTS_TAB).click({ force: true });

    cy.get(EXTERNAL_ALERTS_TAB_CONTENT).should('exist');
  });

  it(`renders users risk tab`, () => {
    cy.get(RISK_SCORE_TAB).click({ force: true });

    cy.get(RISK_SCORE_TAB_CONTENT).should('exist');
  });
});
