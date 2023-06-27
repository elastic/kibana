/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Diagnostics', () => {
  describe('when no data is loaded', () => {
    beforeEach(() => {
      cy.loginAs({ username: 'elastic', password: 'changeme' });
    });

    it('can display summary tab', () => {
      cy.visitKibana('/app/apm/diagnostics');

      // integration package
      cy.get('[data-test-subj="integrationPackageStatus_Badge"]').should(
        'have.text',
        'OK'
      );

      // data stream
      cy.get('[data-test-subj="dataStreamsStatus_Badge"]').should(
        'have.text',
        'OK'
      );

      // Index template
      cy.get('[data-test-subj="indexTemplatesStatus_Badge"]').should(
        'have.text',
        'OK'
      );

      // Index template
      cy.get('[data-test-subj="fieldMappingStatus_Badge"]').should(
        'have.text',
        'OK'
      );
    });
  });

  describe('when importing a file', () => {
    beforeEach(() => {
      cy.loginAs({ username: 'elastic', password: 'changeme' });
      cy.visitKibana('/app/apm/diagnostics/import-export');
      cy.get('#file-picker').selectFile(
        './cypress/e2e/power_user/diagnostics/apm-diagnostics-8.8.0-1687436214804.json'
      );
    });

    it('shows the remove button', () => {
      cy.get('[data-test-subj="apmImportCardRemoveReportButton"]').should(
        'exist'
      );
    });

    it('can display summary tab', () => {
      cy.get('[data-test-subj="summary-tab"]').click();

      // integration package
      cy.get('[data-test-subj="integrationPackageStatus_Badge"]').should(
        'have.text',
        'OK'
      );

      cy.get('[data-test-subj="integrationPackageStatus_Content"]').should(
        'have.text',
        'APM integration (8.8.0)'
      );

      // data stream
      cy.get('[data-test-subj="dataStreamsStatus_Badge"]').should(
        'have.text',
        'OK'
      );

      // Index template
      cy.get('[data-test-subj="indexTemplatesStatus_Badge"]').should(
        'have.text',
        'OK'
      );

      // Index template
      cy.get('[data-test-subj="fieldMappingStatus_Badge"]').should(
        'have.text',
        'Warning'
      );
    });

    it('can display index template tab', () => {
      cy.get('[data-test-subj="index-templates-tab"]').click();
      cy.get('.euiTableRow').should('have.length', 19);
    });

    it('can display data streams tab', () => {
      cy.get('[data-test-subj="data-streams-tab"]').click();
      cy.get('.euiTableRow').should('have.length', 8);
    });

    it('can display indices tab', () => {
      cy.get('[data-test-subj="indices-tab"]').click();

      cy.get('[data-test-subj="indicedWithProblems"] .euiTableRow').should(
        'have.length',
        138
      );

      cy.get('[data-test-subj="indicedWithoutProblems"] .euiTableRow').should(
        'have.length',
        27
      );
    });

    it('can display documents tab', () => {
      cy.get('[data-test-subj="documents-tab"]').click();

      cy.get('[data-test-subj="documents-table"] .euiTableRow').should(
        'have.length',
        10
      );
    });
  });
});
