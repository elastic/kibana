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
import { login } from '@kbn/security-solution-plugin/public/management/cypress/tasks/login';

import type { LoadedRoleAndUser } from '@kbn/test-suites-serverless/shared/lib';
import type { ServerlessRoleName } from './roles';

import { waitUntil } from '../tasks/wait_until';
import { isCloudServerless, isServerless } from '../tasks/serverless';

export interface LoadUserAndRoleCyTaskOptions {
  name: ServerlessRoleName;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface SuiteConfigOverrides {
      env?: {
        ftrConfig: SecuritySolutionDescribeBlockFtrConfig;
      };
    }

    interface Chainable {
      task(
        name: 'loadUserAndRole',
        arg: LoadUserAndRoleCyTaskOptions,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<LoadedRoleAndUser>;

      getBySel(...args: Parameters<Cypress.Chainable['get']>): Chainable<JQuery<HTMLElement>>;

      getBySelContains(
        ...args: Parameters<Cypress.Chainable['get']>
      ): Chainable<JQuery<HTMLElement>>;

      clickOutside(): Chainable<JQuery<HTMLBodyElement>>;

      login(role: ServerlessRoleName, useCookiesForMKI?: boolean): void;

      waitUntil(fn: () => Cypress.Chainable): Cypress.Chainable | undefined;
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

Cypress.Commands.add('login', (role, useCookiesForMKI = true) => {
  // MKI does not support multiple logins throughout the test suite using cookies.
  // Until a better alternative is found, we will prevent multiple logins in the MKI environment in test suites.
  if (isCloudServerless && !useCookiesForMKI) {
    return;
  }

  if (isServerless && !isCloudServerless) {
    // Do not use login.with in MKI env, default to login which will route to proper login method
    return login.with(role, 'changeme');
  }

  // @ts-expect-error hackish way to provide a new role in Osquery ESS only (Reader)
  return login(role);
});

Cypress.Commands.add('waitUntil', waitUntil);

// Alternatively you can use CommonJS syntax:
// require('./commands')
Cypress.on('uncaught:exception', () => false);
