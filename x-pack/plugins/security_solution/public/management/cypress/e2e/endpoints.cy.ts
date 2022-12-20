/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../tasks/login';
import { runResolverGeneratorScript } from '../tasks/resolver_generator';

describe('Endpoints page', () => {
  before(() => {
    runResolverGeneratorScript();
  });

  beforeEach(() => {
    login();
  });

  it('Loads the endpoints page', () => {
    cy.visit('/app/security/administration/endpoints');
    cy.contains('Hosts Elastic Defend').should('exist');
  });
});
