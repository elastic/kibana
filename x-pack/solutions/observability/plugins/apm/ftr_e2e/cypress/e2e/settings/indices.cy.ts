/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const basePath = '/app/apm/settings/apm-indices';

const getAbleToModifyCase = () => {
  it('should be able to modify settings', () => {
    const newErrorIndex = 'logs-*';
    cy.visitKibana(basePath);
    const input = cy.get('input[name="error"]');
    input.should('not.be.disabled');
    input.clear().type(newErrorIndex);
    cy.intercept('POST', '/internal/apm/settings/apm-indices/save*').as('internalApiRequest');
    cy.contains('Apply changes').should('not.be.disabled').click();
    cy.wait('@internalApiRequest').its('response.statusCode').should('eq', 200);
  });
};

const getUnableToModifyCase = () => {
  it('should not be able to modify settings', () => {
    cy.visitKibana(basePath);
    const input = cy.get('input[name="error"]');
    input.should('be.disabled');
    cy.contains('Apply changes').should('be.disabled');
  });
};

describe('Indices', () => {
  describe('when logged in as a viewer', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    getUnableToModifyCase();
  });

  describe('when logged in as an editor', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
    });

    getAbleToModifyCase();
  });

  describe('when logged in as a viewer with write settings access', () => {
    beforeEach(() => {
      cy.loginAsApmReadPrivilegesWithWriteSettingsUser();
    });

    getAbleToModifyCase();
  });

  describe('when logged in as an editor without write settings access', () => {
    beforeEach(() => {
      cy.loginAsApmAllPrivilegesWithoutWriteSettingsUser();
    });

    getUnableToModifyCase();
  });
});
