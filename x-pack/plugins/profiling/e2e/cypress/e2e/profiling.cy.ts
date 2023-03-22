/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

describe('Profiling', () => {
  before(() => {
    cy.loginAsElastic();
  });
  it('Shows profiling empty prompt', () => {
    cy.visitKibana('/app/profiling');
    cy.contains('Universal Profiling (now in Beta)');
  });
});
