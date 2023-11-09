/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('No data screen', () => {
  describe('bypass no data screen on settings pages', () => {
    before(() => {
      // Change indices
      setApmIndices({
        error: 'foo-*',
        onboarding: 'foo-*',
        span: 'foo-*',
        transaction: 'foo-*',
        metric: 'foo-*',
      });
    });

    beforeEach(() => {
      cy.loginAsEditorUser();
    });

    it('shows no data screen instead of service inventory', () => {
      cy.visitKibana('/app/apm/');
      cy.contains('Welcome to Elastic Observability!');
    });

    it('shows settings page', () => {
      cy.visitKibana('/app/apm/settings');
      cy.contains('Welcome to Elastic Observability!').should('not.exist');
      cy.get('h1').contains('Settings');
    });

    after(() => {
      // reset to default indices
      setApmIndices({
        error: '',
        onboarding: '',
        span: '',
        transaction: '',
        metric: '',
      });
    });
  });
});

function setApmIndices(body: Record<string, string>) {
  cy.request({
    url: '/internal/apm/settings/apm-indices/save',
    method: 'POST',
    body,
    headers: { 'kbn-xsrf': true },
    auth: { user: 'editor', pass: 'changeme' },
  });
}
