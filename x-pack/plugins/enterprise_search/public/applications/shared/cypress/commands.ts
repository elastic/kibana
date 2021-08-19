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
