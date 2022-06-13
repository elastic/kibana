/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';

before(() => {
  login();
});

describe('Sources page', () => {
  before(() => {
    cy.visit('/app/threatIntelligence/sources');
  });

  it('should work', () => {
    cy.get('.euiTitle').should('have.text', 'Threat intelligence');
    cy.get('[data-testid="DefaultPageLayout-subheader"]').should('have.text', 'Your data sources');
  });
});
