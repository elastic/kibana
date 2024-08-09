/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Custom no data page', () => {
  beforeEach(() => {
    cy.loginAsEditorUser();
  });

  before(() => {
    // make sure entity centric experience is disabled
    cy.updateAdvancedSettings({
      'observability:entityCentricExperience': false,
    });
  });

  after(() => {
    cy.updateAdvancedSettings({
      'observability:entityCentricExperience': false,
    });
  });

  it('shows the default no data screen when entity centric experience is disabled ', () => {
    cy.visitKibana('/app/apm');
    cy.contains('Welcome to Elastic Observability!');
  });

  it('shows the custom no data screen when entity centric experience is enabled', () => {
    cy.updateAdvancedSettings({
      'observability:entityCentricExperience': true,
    });
    cy.visitKibana('/app/apm');
    cy.contains('Welcome to Elastic Observability!').should('not.exist');
    cy.contains('Detect and resolve problems with your application');
    cy.contains('Try collecting services from logs');
  });
});
