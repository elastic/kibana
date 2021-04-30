/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

Cypress.Commands.add('loginAsReadOnlyUser', () => {
  cy.loginAs({ username: 'apm_read_user', password: 'changeme' });
});

Cypress.Commands.add('loginAsSuperUser', () => {
  cy.loginAs({ username: 'elastic', password: 'changeme' });
});

Cypress.Commands.add(
  'loginAs',
  ({ username, password }: { username: string; password: string }) => {
    cy.log(`Logging in as ${username}`);
    const kibanaUrl = Cypress.env('KIBANA_URL');
    cy.request({
      method: 'POST',
      url: `${kibanaUrl}/internal/security/login`,
      body: {
        providerType: 'basic',
        providerName: 'basic',
        currentURL: `${kibanaUrl}/login`,
        params: { username, password },
      },
      headers: {
        'kbn-xsrf': 'e2e_test',
      },
    });
  }
);
