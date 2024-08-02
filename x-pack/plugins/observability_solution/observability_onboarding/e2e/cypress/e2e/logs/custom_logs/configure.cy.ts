/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Failing: See https://github.com/elastic/kibana/issues/186215
describe.skip('[Logs onboarding] Custom logs - configure step', () => {
  describe('logFilePaths', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana('/app/observabilityOnboarding/customLogs');
    });

    describe('when user clicks on back button', () => {
      beforeEach(() => {
        cy.loginAsViewerUser();
        cy.visitKibana('/app/observabilityOnboarding/customLogs');
      });

      it('navigates to observability logs onboarding page', () => {
        cy.getByTestSubj('observabilityOnboardingFlowBackToSelectionButton').click();

        cy.url().should('include', '/app/observabilityOnboarding');
      });
    });

    it('Users shouldnt be able to continue if logFilePaths is empty', () => {
      cy.getByTestSubj('obltOnboardingLogFilePath-0').find('input').should('not.have.text');
      cy.getByTestSubj('obltOnboardingCustomLogsContinue').should('be.disabled');
    });

    it('Users should be able to continue if logFilePaths is not empty', () => {
      cy.getByTestSubj('obltOnboardingLogFilePath-0').find('input').type('myLogs.log');
      cy.getByTestSubj('obltOnboardingCustomLogsContinue').should('not.be.disabled');
    });

    it('Users can add multiple logFilePaths', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsAddFilePath').click();
      cy.getByTestSubj('obltOnboardingLogFilePath-0').should('exist');
      cy.getByTestSubj('obltOnboardingLogFilePath-1').should('exist');
    });

    it('Users can delete logFilePaths', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsAddFilePath').click();
      cy.get('*[data-test-subj^="obltOnboardingLogFilePath-"]').should('have.length', 2);

      cy.getByTestSubj('obltOnboardingLogFilePathDelete-1').click();
      cy.get('*[data-test-subj^="obltOnboardingLogFilePath-"]').should('have.length', 1);
    });

    describe('when users fill logFilePaths', () => {
      it('datasetname and integration name are auto generated if it is the first path', () => {
        cy.getByTestSubj('obltOnboardingLogFilePath-0').find('input').type('myLogs.log');
        cy.getByTestSubj('obltOnboardingCustomLogsIntegrationsName').should('have.value', 'mylogs');
        cy.getByTestSubj('obltOnboardingCustomLogsDatasetName').should('have.value', 'mylogs');
      });

      it('datasetname and integration name are not generated if it is not the first path', () => {
        cy.getByTestSubj('obltOnboardingCustomLogsAddFilePath').click();
        cy.getByTestSubj('obltOnboardingLogFilePath-1').find('input').type('myLogs.log');
        cy.getByTestSubj('obltOnboardingCustomLogsIntegrationsName').should('be.empty');
        cy.getByTestSubj('obltOnboardingCustomLogsDatasetName').should('be.empty');
      });
    });
  });

  describe('serviceName', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana('/app/observabilityOnboarding/customLogs');

      cy.getByTestSubj('obltOnboardingLogFilePath-0').find('input').type('myLogs.log');
    });

    it('should be optional allowing user to continue if it is empty', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsServiceName').should('not.have.text');
      cy.getByTestSubj('obltOnboardingCustomLogsContinue').should('be.enabled');
    });
  });

  describe('advancedSettings', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana('/app/observabilityOnboarding/customLogs');

      cy.getByTestSubj('obltOnboardingLogFilePath-0').find('input').type('myLogs.log');
    });

    it('Users should expand the content when clicking it', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsAdvancedSettings').click();

      cy.getByTestSubj('obltOnboardingCustomLogsNamespace').should('be.visible');
      cy.getByTestSubj('obltOnboardingCustomLogsCustomConfig').should('be.visible');
    });

    it('Users should hide the content when clicking it', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsAdvancedSettings').click();

      cy.getByTestSubj('obltOnboardingCustomLogsNamespace').should('not.be.visible');
      cy.getByTestSubj('obltOnboardingCustomLogsCustomConfig').should('not.be.visible');
    });

    describe('Namespace', () => {
      beforeEach(() => {
        cy.getByTestSubj('obltOnboardingCustomLogsAdvancedSettings').click();
      });

      afterEach(() => {
        cy.getByTestSubj('obltOnboardingCustomLogsAdvancedSettings').click();
      });

      it('Users should see a default namespace', () => {
        cy.getByTestSubj('obltOnboardingCustomLogsNamespace').should('have.value', 'default');
      });

      it('Users should not be able to continue if they do not specify a namespace', () => {
        cy.getByTestSubj('obltOnboardingCustomLogsNamespace').clear();

        cy.getByTestSubj('obltOnboardingCustomLogsContinue').should('be.disabled');
      });
    });

    describe('customConfig', () => {
      beforeEach(() => {
        cy.getByTestSubj('obltOnboardingCustomLogsAdvancedSettings').click();
      });

      afterEach(() => {
        cy.getByTestSubj('obltOnboardingCustomLogsAdvancedSettings').click();
      });

      it('should be optional allowing user to continue if it is empty', () => {
        cy.getByTestSubj('obltOnboardingCustomLogsCustomConfig').should('not.have.text');
        cy.getByTestSubj('obltOnboardingCustomLogsContinue').should('be.enabled');
      });
    });
  });

  describe('integrationName', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana('/app/observabilityOnboarding/customLogs');

      cy.getByTestSubj('obltOnboardingLogFilePath-0').find('input').type('myLogs.log');
    });

    it('Users should not be able to continue if they do not specify an integrationName', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsIntegrationsName').clear();

      cy.getByTestSubj('obltOnboardingCustomLogsContinue').should('be.disabled');
    });

    it('value will contain _ instead of special chars', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsIntegrationsName').clear().type('hello$world');

      cy.getByTestSubj('obltOnboardingCustomLogsIntegrationsName').should(
        'have.value',
        'hello_world'
      );
    });

    it('value will be invalid if it is not lowercase', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsIntegrationsName').clear().type('H3llowOrld');

      cy.contains('An integration name should be lowercase.');
    });
  });

  describe('datasetName', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana('/app/observabilityOnboarding/customLogs');

      cy.getByTestSubj('obltOnboardingLogFilePath-0').find('input').type('myLogs.log');
    });

    it('Users should not be able to continue if they do not specify a datasetName', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsDatasetName').clear();

      cy.getByTestSubj('obltOnboardingCustomLogsContinue').should('be.disabled');
    });

    it('value will contain _ instead of special chars', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsDatasetName').clear().type('hello$world');

      cy.getByTestSubj('obltOnboardingCustomLogsDatasetName').should('have.value', 'hello_world');
    });

    it('value will be invalid if it is not lowercase', () => {
      cy.getByTestSubj('obltOnboardingCustomLogsDatasetName').clear().type('H3llowOrld');

      cy.contains('A dataset name should be lowercase.');
    });
  });

  describe('custom integration', () => {
    const CUSTOM_INTEGRATION_NAME = 'mylogs';

    beforeEach(() => {
      cy.deleteIntegration(CUSTOM_INTEGRATION_NAME);
    });

    describe('when user is missing privileges', () => {
      beforeEach(() => {
        cy.loginAsViewerUser();
        cy.visitKibana('/app/observabilityOnboarding/customLogs');

        cy.getByTestSubj('obltOnboardingLogFilePath-0')
          .find('input')
          .type(`${CUSTOM_INTEGRATION_NAME}.log`);

        cy.getByTestSubj('obltOnboardingCustomLogsContinue').click();
      });

      it('installation fails', () => {
        cy.getByTestSubj('obltOnboardingCustomIntegrationErrorCallout').should('exist');
      });
    });

    describe('when user has proper privileges', () => {
      beforeEach(() => {
        cy.loginAsEditorUser();
        cy.visitKibana('/app/observabilityOnboarding/customLogs');

        cy.getByTestSubj('obltOnboardingLogFilePath-0')
          .find('input')
          .type(`${CUSTOM_INTEGRATION_NAME}.log`);

        cy.getByTestSubj('obltOnboardingCustomLogsContinue').click();
      });

      afterEach(() => {
        cy.deleteIntegration(CUSTOM_INTEGRATION_NAME);
      });

      it('installation succeed and user is redirected install elastic agent step', () => {
        cy.url().should('include', '/app/observabilityOnboarding/customLogs/installElasticAgent');
      });
    });

    it('installation fails if integration already exists', () => {
      cy.loginAsEditorUser();
      cy.visitKibana('/app/observabilityOnboarding/customLogs');

      cy.installCustomIntegration(CUSTOM_INTEGRATION_NAME);
      cy.getByTestSubj('obltOnboardingLogFilePath-0')
        .find('input')
        .type(`${CUSTOM_INTEGRATION_NAME}.log`);
      cy.getByTestSubj('obltOnboardingCustomLogsContinue').click();

      cy.contains(
        'Failed to create the integration as an installation with the name mylogs already exists.'
      );
    });

    describe('when an error occurred on creation', () => {
      before(() => {
        cy.intercept('/api/fleet/epm/custom_integrations', {
          statusCode: 500,
          body: {
            message: 'Internal error',
          },
        });

        cy.loginAsEditorUser();
        cy.visitKibana('/app/observabilityOnboarding/customLogs');

        cy.getByTestSubj('obltOnboardingLogFilePath-0')
          .find('input')
          .type(`${CUSTOM_INTEGRATION_NAME}.log`);
        cy.getByTestSubj('obltOnboardingCustomLogsContinue').click();
      });

      it('user should see the error displayed', () => {
        cy.getByTestSubj('obltOnboardingCustomIntegrationErrorCallout').should('exist');
      });
    });
  });
});
