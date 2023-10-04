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

// @ts-expect-error ts(2306)  module has some interesting ways of importing, see https://github.com/cypress-io/cypress/blob/0871b03c5b21711cd23056454da8f23dcaca4950/npm/grep/README.md#support-file
import registerCypressGrep from '@cypress/grep';

registerCypressGrep();

import type { SecuritySolutionDescribeBlockFtrConfig } from '@kbn/security-solution-plugin/scripts/run_cypress/utils';
import type { ServerlessRoleName } from './roles';

import 'cypress-react-selector';
import { login } from '../../../../test_serverless/functional/test_suites/security/cypress/tasks/login';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface SuiteConfigOverrides {
      env?: {
        ftrConfig: SecuritySolutionDescribeBlockFtrConfig;
      };
    }

    interface Chainable {
      getBySel(...args: Parameters<Cypress.Chainable['get']>): Chainable<JQuery<HTMLElement>>;

      getBySelContains(
        ...args: Parameters<Cypress.Chainable['get']>
      ): Chainable<JQuery<HTMLElement>>;

      clickOutside(): Chainable<JQuery<HTMLBodyElement>>;

      login(role?: ServerlessRoleName | 'elastic'): void;
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

Cypress.Commands.add('login', (role) => {
  // TODO Temporary approach to login until login with role is supported in serverless
  // Cypress.Commands.add('login', login);
  const isServerless = Cypress.env().IS_SERVERLESS;

  if (isServerless) {
    return login.with('system_indices_superuser', 'changeme');
  }

  return login(role);
});

const waitUntil = (subject, fn) => {
  const timeout = 90000;
  const interval = 5000;
  let attempts = Math.floor(timeout / interval);

  const completeOrRetry = (result) => {
    if (result) {
      return result;
    }

    if (attempts < 1) {
      throw new Error(`Timed out while retrying, last result was: {${result}}`);
    }

    cy.wait(interval, { log: false }).then(() => {
      attempts--;

      return evaluate();
    });
  };

  const evaluate = () => {
    const result = fn(subject);

    if (result && result.then) {
      return result.then(completeOrRetry);
    } else {
      return completeOrRetry(result);
    }
  };

  return evaluate();
};

Cypress.Commands.add('waitUntil', { prevSubject: 'optional' }, waitUntil);

// Alternatively you can use CommonJS syntax:
// require('./commands')
Cypress.on('uncaught:exception', () => false);
