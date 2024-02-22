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

Cypress.Commands.add('visitKibana', (url, query) => {
  const urlPath = URL.format({
    pathname: url,
    query,
  });

  cy.visit(urlPath);
  cy.getByTestSubj('kbnLoadingMessage').should('exist');
  cy.getByTestSubj('kbnLoadingMessage').should('not.exist', {
    timeout: 50000,
  });
});

Cypress.Commands.add(
  'addKqlFilter',
  ({ key, value, dataTestSubj = 'profilingUnifiedSearchBar', waitForSuggestion = true }) => {
    cy.getByTestSubj(dataTestSubj).type(key);
    cy.contains(key);
    cy.getByTestSubj(`autocompleteSuggestion-field-${key}-`).click();
    // Do not close quotes here as it will not display the suggestion box
    cy.getByTestSubj(dataTestSubj).type(`: "${value}`);
    if (waitForSuggestion) {
      cy.getByTestSubj(
        Cypress.$.escapeSelector(`autocompleteSuggestion-value-"${value}"-`)
      ).click();
    }
    cy.getByTestSubj(dataTestSubj).type('{enter}');
  }
);

Cypress.Commands.add('updateAdvancedSettings', (settings: Record<string, unknown>) => {
  const kibanaUrl = Cypress.env('KIBANA_URL');
  cy.request({
    log: false,
    method: 'POST',
    url: `${kibanaUrl}/internal/kibana/settings`,
    body: { changes: settings },
    headers: {
      'kbn-xsrf': 'e2e_test',
    },
    auth: { user: 'elastic', pass: 'changeme' },
  });
});
