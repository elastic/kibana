/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, checkA11y } from '../../../shared/cypress/commands';
import { overviewPath } from '../../../shared/cypress/routes';

context('Enterprise Search Overview', () => {
  beforeEach(() => {
    login();
  });

  it('should contain product cards', () => {
    cy.visit(overviewPath);
    cy.contains('Welcome to Elastic Enterprise Search');

    cy.get('[data-test-subj="appSearchProductCard"]')
      .contains('Open App Search')
      .should('have.attr', 'href')
      .and('match', /app_search/);

    cy.get('[data-test-subj="workplaceSearchProductCard"]')
      .contains('Open Workplace Search')
      .should('have.attr', 'href')
      .and('match', /workplace_search/);

    checkA11y();
  });

  it('should have a setup guide', () => {
    // @see https://github.com/quasarframework/quasar/issues/2233#issuecomment-492975745
    // This only appears to occur for setup guides - I haven't (yet?) run into it on other pages
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('> ResizeObserver loop limit exceeded')) return false;
    });

    cy.visit(`${overviewPath}/setup_guide`);
    cy.contains('Setup Guide');
    cy.contains('Add your Enterprise Search host URL to your Kibana configuration');

    checkA11y();
  });
});
