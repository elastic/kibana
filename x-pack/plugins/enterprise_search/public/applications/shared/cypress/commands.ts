/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Shared non-product-specific commands
 */

/*
 * Log in a user via XHR
 * @see https://docs.cypress.io/guides/getting-started/testing-your-app#Logging-in
 */
interface Login {
  username?: string;
  password?: string;
}
export const login = ({
  username = Cypress.env('username'),
  password = Cypress.env('password'),
}: Login = {}) => {
  cy.request({
    method: 'POST',
    url: '/internal/security/login',
    headers: { 'kbn-xsrf': 'cypress' },
    body: {
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: { username, password },
    },
  });
};

/*
 * Cypress setup/helpers
 */

// eslint complains this should be in `dependencies` and not `devDependencies`, but these tests should only run on dev
// eslint-disable-next-line import/no-extraneous-dependencies
import 'cypress-axe';
// eslint-disable-next-line import/no-extraneous-dependencies
import { AXE_CONFIG, AXE_OPTIONS } from '@kbn/test';

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
  cy.checkA11y(context, axeOptions);
};
