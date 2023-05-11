/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import URL from 'url';

Cypress.Commands.add(
  'loginAs',
  ({ username, password }: { username: string; password: string }) => {
    const kibanaUrl = Cypress.env('KIBANA_URL');
    cy.log(`Logging in as ${username} on ${kibanaUrl}`);
    cy.visit('/');
    cy.request({
      log: true,
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
    cy.visit('/');
  }
);

Cypress.Commands.add('loginAsElastic', () => {
  return cy.loginAs({
    username: 'elastic',
    password: 'changeme',
  });
});

Cypress.Commands.add('getByTestSubj', (selector: string) => {
  return cy.get(`[data-test-subj="${selector}"]`);
});

Cypress.Commands.add(
  'visitKibana',
  (url: string, rangeFrom?: string, rangeTo?: string) => {
    const urlPath = URL.format({
      pathname: url,
      query: { rangeFrom, rangeTo },
    });

    cy.visit(urlPath);
    cy.getByTestSubj('kbnLoadingMessage').should('exist');
    cy.getByTestSubj('kbnLoadingMessage').should('not.exist', {
      timeout: 50000,
    });
  }
);
