/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('404', () => {
  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  it('Shows 404 page', () => {
    cy.visitKibana('/app/apm/foo');

    cy.contains('Page not found');
  });
});
