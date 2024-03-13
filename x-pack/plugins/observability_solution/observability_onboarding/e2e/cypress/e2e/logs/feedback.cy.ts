/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('[Logs onboarding] Give Feedback', () => {
  beforeEach(() => {
    cy.loginAsElastic();
    cy.visitKibana('/app/observabilityOnboarding');
  });

  it('feedback button is present in system logs onboarding', () => {
    cy.getByTestSubj('obltOnboardingHomeStartSystemLogStream').click();
    cy.getByTestSubj('observabilityOnboardingPageGiveFeedback').should('exist');
  });

  it('feedback button is present in custom logs onboarding', () => {
    cy.getByTestSubj('obltOnboardingHomeStartLogFileStream').click();
    cy.getByTestSubj('observabilityOnboardingPageGiveFeedback').should('exist');
  });

  it('feedback button is not present in the landing page', () => {
    cy.getByTestSubj('observabilityOnboardingPageGiveFeedback').should(
      'not.exist'
    );
  });
});
