/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export {};

const TEST_PACKAGE = 'input_package-1.0.0';
describe('Edit package policy', () => {
  before(() => {
    cy.task('installTestPackage', TEST_PACKAGE);
  });
  after(() => {
    cy.task('uninstallTestPackage', TEST_PACKAGE);
  });
  it('should edit package policy', () => {
    // visit test package page
    cy.visit(`/app/integrations/detail/${TEST_PACKAGE}/overview`);
  });
});
