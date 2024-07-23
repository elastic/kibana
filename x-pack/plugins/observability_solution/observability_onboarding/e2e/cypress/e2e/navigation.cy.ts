/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Failing: See https://github.com/elastic/kibana/issues/183341
describe.skip('[Observability onboarding] Navigation', () => {
  beforeEach(() => {
    cy.loginAsElastic();
    cy.visitKibana('/app/observabilityOnboarding/');
  });

  describe('When user clicks on the card', () => {
    it('navigates to system logs onboarding', () => {
      cy.getByTestSubj('obltOnboardingHomeStartSystemLogStream').click();

      cy.url().should('include', '/app/observabilityOnboarding/systemLogs');
    });

    it('navigates to custom logs onboarding', () => {
      cy.getByTestSubj('obltOnboardingHomeStartLogFileStream').click();

      cy.url().should('include', '/app/observabilityOnboarding/customLogs');
    });

    it('navigates to apm tutorial', () => {
      cy.getByTestSubj('obltOnboardingHomeStartApmTutorial').click();

      cy.url().should('include', '/app/home#/tutorial/apm');
    });

    it('navigates to kubernetes integration', () => {
      cy.getByTestSubj('obltOnboardingHomeGoToKubernetesIntegration').click();

      cy.url().should('include', '/app/integrations/detail/kubernetes/overview');
    });

    it('navigates to integrations', () => {
      cy.getByTestSubj('obltOnboardingHomeExploreIntegrations').click();

      cy.url().should('include', '/app/integrations/browse');
    });
  });

  describe('When user clicks on Quick links', () => {
    it('navigates to use sample data', () => {
      cy.getByTestSubj('obltOnboardingHomeUseSampleData').click();

      cy.url().should('include', '/app/home#/tutorial_directory/sampleData');
    });

    it('navigates to upload a file', () => {
      cy.getByTestSubj('obltOnboardingHomeUploadAFile').click();

      cy.url().should('include', '/app/home#/tutorial_directory/fileDataViz');
    });
  });
});
