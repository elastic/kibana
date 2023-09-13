/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Diagnostics', () => {
  describe('when logging in as superuser', () => {
    beforeEach(() => {
      cy.loginAsSuperUser();
    });

    describe('when no data is loaded', () => {
      it('can display summary tab for superuser', () => {
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
      it('shows the remove button', () => {
        importBundle();
        cy.get('[data-test-subj="apmImportCardRemoveReportButton"]').should(
          'exist'
        );
        clearBundle();
        cy.get('[data-test-subj="apmImportCardRemoveReportButton"]').should(
          'not.exist'
        );
      });

      it('can display summary tab', () => {
        importBundle();
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
        importBundle();
        cy.get('[data-test-subj="index-templates-tab"]').click();
        cy.get('.euiTableRow').should('have.length', 19);
      });

      it('can display data streams tab', () => {
        importBundle();
        cy.get('[data-test-subj="data-streams-tab"]').click();
        cy.get('.euiTableRow').should('have.length', 8);
      });

      it('can display indices tab', () => {
        importBundle();
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
    });
  });

  describe('when logging in as "viewer" user', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    describe('when no data is loaded', () => {
      it('displays a warning on "summary" tab about missing privileges ', () => {
        cy.visitKibana('/app/apm/diagnostics');

        cy.get('.euiPanel > .euiText').should(
          'contain.text',
          'Not all features are available due to missing privileges.'
        );
      });

      it('hides the tabs that require cluster privileges', () => {
        cy.visitKibana('/app/apm/diagnostics');

        const tabs = ['Summary', 'Documents', 'Import/Export'];
        cy.get(
          '[data-test-subj="apmDiagnosticsTemplate"] .euiTabs .euiTab'
        ).each((tab, i) => cy.wrap(tab).should('have.text', tabs[i]));
      });
    });

    describe('when importing a file', () => {
      it('displays documents tab for the imported bundle', () => {
        importBundle();
        cy.get('[data-test-subj="documents-tab"]').click();

        cy.get('[data-test-subj="documents-table"] .euiTableRow').should(
          'have.length',
          10
        );
      });
    });
  });
});

function importBundle() {
  cy.visitKibana('/app/apm/diagnostics/import-export');
  cy.get('#file-picker').selectFile(
    './cypress/e2e/diagnostics/apm-diagnostics-8.8.0-1687436214804.json'
  );
}

function clearBundle() {
  cy.get('[data-test-subj="apmTemplateDescriptionClearBundleButton"]').click();
}
