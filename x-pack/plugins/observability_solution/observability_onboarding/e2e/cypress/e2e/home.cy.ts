/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Failing: See https://github.com/elastic/kibana/issues/183341
describe.skip('[Observability onboarding] Landing page', () => {
  beforeEach(() => {
    cy.loginAsElastic();
  });

  describe('Entry point', () => {
    it('when clicking on the logs card the user is navigated to the observability onboarding page', () => {
      cy.getByTestSubj('guideButtonRedirect').click();
      cy.getByTestSubj('guide-filter-observability').click();
      cy.getByTestSubj('onboarding--observability--logs').click();

      cy.url().should('include', '/app/observabilityOnboarding');
    });

    it('when clicking on observability overview callout the user is navigated to the observability onboarding page', () => {
      cy.visitKibana('/app/observability');
      cy.getByTestSubj('observability-onboarding-callout').should('exist');
      cy.getByTestSubj('o11yObservabilityOnboardingGetStartedButton').click();

      cy.url().should('include', '/app/observabilityOnboarding');
    });
  });

  it('when user navigates to observability onboarding landing page is showed', () => {
    cy.visitKibana('/app/observabilityOnboarding');
    cy.contains('Onboard Observability data');
  });
});
