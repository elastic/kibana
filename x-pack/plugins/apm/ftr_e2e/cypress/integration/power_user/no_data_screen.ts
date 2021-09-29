/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

const apmIndicesSaveURL = '/api/apm/settings/apm-indices/save';

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
          'apm_oss.sourcemapIndices': 'foo-*',
          'apm_oss.errorIndices': 'foo-*',
          'apm_oss.onboardingIndices': 'foo-*',
          'apm_oss.spanIndices': 'foo-*',
          'apm_oss.transactionIndices': 'foo-*',
          'apm_oss.metricsIndices': 'foo-*',
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
          'apm_oss.sourcemapIndices': '',
          'apm_oss.errorIndices': '',
          'apm_oss.onboardingIndices': '',
          'apm_oss.spanIndices': '',
          'apm_oss.transactionIndices': '',
          'apm_oss.metricsIndices': '',
        },
        headers: { 'kbn-xsrf': true },
        auth: { user: 'apm_power_user', pass: 'changeme' },
      });
    });
  });
});
