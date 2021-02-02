/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

describe('Home page', () => {
  it('Redirects to service page with rangeFrom and rangeTo added to the URL', () => {
    const endDate = new Date(Cypress.env('END_DATE'));
    cy.clock(endDate);

    cy.visit('/app/apm');

    cy.url().should(
      'include',
      'app/apm/services?rangeFrom=now-15m&rangeTo=now'
    );
    cy.get('.euiTabs .euiTab-isSelected').contains('Services');
  });
});
