/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
describe('No data screen', () => {
  beforeEach(() => {
    cy.loginAsPowerUser();
  });
  const fieldNames = [
    'apm_oss.sourcemapIndices',
    'apm_oss.errorIndices',
    'apm_oss.onboardingIndices',
    'apm_oss.spanIndices',
    'apm_oss.transactionIndices',
    'apm_oss.metricsIndices',
  ];
  it('by pass no data screen on settings pages', () => {
    cy.visit('/app/apm/settings/apm-indices');
    fieldNames.map((fieldName) => {
      cy.get(`input[name="${fieldName}"]`).type('foo-*');
    });
    cy.contains('Apply changes').click();
    cy.contains('Indices applied');
    cy.visit('/app/apm/');
    cy.contains('Welcome to Elastic Observability!');
    cy.contains('Settings').click();
    cy.contains('Welcome to Elastic Observability!').should('not.exist');
    cy.visit('/app/apm/settings/apm-indices');
    fieldNames.map((fieldName) => {
      cy.get(`input[name="${fieldName}"]`).clear();
    });
    cy.contains('Apply changes').click();
    cy.contains('Indices applied');
  });
});
