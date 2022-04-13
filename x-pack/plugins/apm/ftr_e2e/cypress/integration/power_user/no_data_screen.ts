/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const apmIndicesSaveURL = '/internal/apm/settings/apm-indices/save';

describe('No data screen', () => {
  describe('bypass no data screen on settings pages', () => {
    beforeEach(() => {
      cy.loginAsPowerUser();
    });

    before(() => {
      // Change default indices
      cy.request({
        url: apmIndicesSaveURL,
        method: 'POST',
        body: {
          sourcemap: 'foo-*',
          error: 'foo-*',
          onboarding: 'foo-*',
          span: 'foo-*',
          transaction: 'foo-*',
          metric: 'foo-*',
        },
        headers: {
          'kbn-xsrf': true,
        },
        auth: { user: 'apm_power_user', pass: 'changeme' },
      });
    });

    it('shows no data screen instead of service inventory', () => {
      cy.visit('/app/apm/');
      cy.contains('Welcome to Elastic Observability!');
    });
    it('shows settings page', () => {
      cy.visit('/app/apm/settings');
      cy.contains('Welcome to Elastic Observability!').should('not.exist');
      cy.get('h1').contains('Settings');
    });

    after(() => {
      // reset to default indices
      cy.request({
        url: apmIndicesSaveURL,
        method: 'POST',
        body: {
          sourcemap: '',
          error: '',
          onboarding: '',
          span: '',
          transaction: '',
          metric: '',
        },
        headers: { 'kbn-xsrf': true },
        auth: { user: 'apm_power_user', pass: 'changeme' },
      });
    });
  });
});
