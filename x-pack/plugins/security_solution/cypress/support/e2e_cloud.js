/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';
import 'cypress-real-events/support';

Cypress.on('uncaught:exception', () => {
  return false;
});

before(() => {
  Cypress.config('baseUrl', 'http://elastic:changeme@localhost:5622');
  // cy.request('GET', 'http://localhost:5622', { timeout: 60000 }).as('waitForKibana');
  // cy.get('@waitForKibana').should('have.property', 'status', 200);
});
