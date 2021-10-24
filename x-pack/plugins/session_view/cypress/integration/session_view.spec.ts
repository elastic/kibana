/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loginAndWaitForPage } from '../tasks/login';

import { SESSION_VIEW_URL } from '../urls/navigation';

import { cleanKibana } from '../tasks/common';
import { TEST } from '../screens/common/page';

describe('Display session view test page', () => {
  before(() => {
    cleanKibana();
  });

  it('navigates to session view home page', () => {
    loginAndWaitForPage(SESSION_VIEW_URL);
    cy.get(TEST).should('exist');
  });

  it('navigates to session view path 1 page', () => {
    loginAndWaitForPage(`${SESSION_VIEW_URL}/path_1`);
    cy.get(TEST).contains('current path:').should('have.text', 'current path: /path_1');
  });
});
