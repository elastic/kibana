/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint complains this should be in `dependencies` and not `devDependencies`, but these tests should only run on dev
// eslint-disable-next-line import/no-extraneous-dependencies
import { Result } from 'axe-core';

// eslint-disable-next-line import/no-extraneous-dependencies
import 'cypress-axe';
// eslint-disable-next-line import/no-extraneous-dependencies
import { AXE_CONFIG, AXE_OPTIONS } from '@kbn/axe-config';

/*
 * Shared non-product-specific commands
 */

/*
 * Log in a user via XHR
 * @see https://docs.cypress.io/guides/getting-started/testing-your-app#Logging-in
 */
interface Login {
  password?: string;
  username?: string;
}

export const login = ({
  username = Cypress.env('username'),
  password = Cypress.env('password'),
}: Login = {}) => {
  cy.request({
    body: {
      currentURL: '/',
      params: { password, username },
      providerName: 'basic',
      providerType: 'basic',
    },
    headers: { 'kbn-xsrf': 'cypress' },
    method: 'POST',
    url: '/internal/security/login',
  });
};

const _handleViolations = (violations: Result[], skipTestFailure?: boolean) => {
  // Destructure keys from the violations object to create a readable array
  const violationData = violations.map(({ id, description, impact, nodes }) => ({
    description,
    id,
    impact,
    nodes: nodes.length,
  }));

  // Print reporting only message to the console
  // https://github.com/component-driven/cypress-axe#skipfailures-optional-defaults-to-false
  if (skipTestFailure) {
    cy.task(
      'log',
      `
========================================
* A11Y REPORT MODE ONLY
========================================`
    );
  }

  // Print violations to the console using a custom callback
  // https://github.com/component-driven/cypress-axe#using-the-violationcallback-argument
  cy.task(
    'log',
    `${violations.length} violation${violations.length === 1 ? '' : 's'} ${
      violations.length === 1 ? 'was' : 'were'
    } detected.`
  );

  // Print the table of violations to the console
  cy.task('table', violationData);
};

const logViolations = (violations: Result[]) => {
  _handleViolations(violations);
};

/*
 * Cypress setup/helpers
 */

const axeConfig = {
  ...AXE_CONFIG,
  rules: [
    ...AXE_CONFIG.rules,
    {
      id: 'landmark-no-duplicate-banner',
      selector: '[data-test-subj="headerGlobalNav"]',
    },
  ],
};
const axeOptions = {
  ...AXE_OPTIONS,
  runOnly: [...AXE_OPTIONS.runOnly, 'best-practice'],
};

// @see https://github.com/component-driven/cypress-axe#cychecka11y for params
export const checkA11y = () => {
  cy.injectAxe();
  cy.configureAxe(axeConfig);
  const context = '.kbnAppWrapper'; // Scopes a11y checks to only our app
  cy.checkA11y(context, axeOptions, logViolations);
};
