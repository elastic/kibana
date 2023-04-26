/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

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

// Enforce building this file.
export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getBySel(value: string, ...args: any[]): Chainable<any>;
      getKibanaVersion(): Chainable<string>;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBySel(selector: string, ...args: any[]) {
  return cy.get(`[data-test-subj="${selector}"]`, ...args);
}

Cypress.Commands.add('getBySel', getBySel);

Cypress.on('uncaught:exception', () => {
  return false;
});
