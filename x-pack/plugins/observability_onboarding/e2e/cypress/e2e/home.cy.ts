/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('[Observability onboarding] Landing page', () => {
  beforeEach(() => {
    cy.loginAsElastic();
  });

  describe('Entry point', () => {
    it('from setup guides', () => {
      cy.get('[data-test-subj="guideButtonRedirect"]').click();
      cy.get('[data-test-subj="onboarding--observability--logs"]').click();

      cy.url().should('include', '/app/observabilityOnboarding');
    });

    it('from observability overview', () => {
      cy.visitKibana('/app/observability');
      cy.get('[data-test-subj="observability-onboarding-callout"]').should(
        'exist'
      );
      cy.get(
        '[data-test-subj="o11yObservabilityOnboardingGetStartedButton"]'
      ).click();

      cy.url().should('include', '/app/observabilityOnboarding');
    });
  });

  it('shows landing page', () => {
    cy.visitKibana('/app/observabilityOnboarding');
    cy.contains('Get started with Observability');
  });
});
