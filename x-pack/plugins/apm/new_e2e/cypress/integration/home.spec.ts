/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

describe('home', () => {
  it('test', () => {
    const now = new Date(Cypress.env('METADATA_END_DATE'));
    cy.clock(now);

    cy.visit('/app/apm');
  });
});
