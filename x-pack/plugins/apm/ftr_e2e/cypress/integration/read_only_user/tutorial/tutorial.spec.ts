/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('APM tutorial', () => {
  beforeEach(() => {
    cy.loginAsViewerUser();
    cy.visitKibana('/app/home#/tutorial/apm');
  });

  it('includes section for APM Server', () => {
    cy.contains('APM Server');
    cy.contains('Linux DEB');
    cy.contains('Linux RPM');
    cy.contains('macOS');
    cy.contains('Windows');
    cy.contains('Fleet');
  });

  it('includes section for APM Agents', () => {
    cy.contains('APM agents');
    cy.contains('Java');
    cy.contains('RUM');
    cy.contains('Node.js');
    cy.contains('Django');
    cy.contains('Flask');
    cy.contains('Ruby on Rails');
    cy.contains('Rack');
    cy.contains('Go');
    cy.contains('.NET');
    cy.contains('PHP');
  });
});
