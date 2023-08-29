/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('[Logs onboarding] Custom logs - configure step', () => {
  describe('logFilePaths', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana('/app/observabilityOnboarding/customLogs');
    });

    it('Users shouldnt be able to continue if logFilePaths is empty', () => {
      cy.getByTestSubj('obltOnboardingLogFilePath-0')
        .find('input')
        .should('not.have.text');
      cy.getByTestSubj('obltOnboardingCustomLogsContinue').should(
        'be.disabled'
      );
    });

    it('Users should be able to continue if logFilePaths is not empty', () => {
      cy.getByTestSubj('obltOnboardingLogFilePath-0')
        .find('input')
        .first()
        .type('myLogs.log');
      cy.getByTestSubj('obltOnboardingCustomLogsContinue').should(
        'not.be.disabled'
      );
    });

    it('when users fill logFilePaths, datasetname and integration name are auto generated', () => {
      cy.getByTestSubj('obltOnboardingLogFilePath-0')
        .find('input')
        .first()
        .type('myLogs.log');
      cy.getByTestSubj('obltOnboardingCustomLogsIntegrationsName').should(
        'have.value',
        'myLogs'
      );
      cy.getByTestSubj('obltOnboardingCustomLogsDatasetName').should(
        'have.value',
        'myLogs'
      );
    });

    it('Users can add multiple logFilePaths', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsAddFilePath').first().click();
      cy.getByTestSubj('obltOnboardingLogFilePath-0').should('exist');
      cy.getByTestSubj('obltOnboardingLogFilePath-1').should('exist');
    });
  });
});
