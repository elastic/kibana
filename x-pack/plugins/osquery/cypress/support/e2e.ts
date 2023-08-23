/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

// force ESM in this module
export {};

import 'cypress-react-selector';
import registerCypressGrep from '@cypress/grep';

registerCypressGrep();

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      getBySel(...args: Parameters<Cypress.Chainable['get']>): Chainable<JQuery<HTMLElement>>;
      getBySelContains(
        ...args: Parameters<Cypress.Chainable['get']>
      ): Chainable<JQuery<HTMLElement>>;
      clickOutside(): Chainable<JQuery<HTMLBodyElement>>;
    }
  }
}

Cypress.Commands.add('getBySel', (selector, ...args) =>
  cy.get(`[data-test-subj="${selector}"]`, ...args)
);

// finds elements that start with the given selector
Cypress.Commands.add('getBySelContains', (selector, ...args) =>
  cy.get(`[data-test-subj^="${selector}"]`, ...args)
);

Cypress.Commands.add(
  'clickOutside',
  () => cy.get('body').click(0, 0) // 0,0 here are the x and y coordinates
);

// Alternatively you can use CommonJS syntax:
// require('./commands')
Cypress.on('uncaught:exception', () => false);
