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

// force ESM in this module
export {};

// eslint-disable-next-line import/no-extraneous-dependencies
import 'cypress-react-selector';
// import './coverage';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      getBySel(...args: Parameters<Cypress.Chainable['get']>): Chainable<JQuery<HTMLElement>>;
    }
  }
}

Cypress.Commands.add('getBySel', (selector, ...args) =>
  cy.get(`[data-test-subj="${selector}"]`, ...args)
);

// Alternatively you can use CommonJS syntax:
// require('./commands')
Cypress.on('uncaught:exception', () => false);
