/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const basePath = '/app/apm/settings/general-settings';

const getAbleToModifyCase = () => {
  it('should be able to modify settings', () => {
    cy.visitKibana(basePath);
    const button = cy.get('button[name="Inspect ES queries"]');
    button.should('not.be.disabled');
    button.click();
    cy.intercept('POST', '/internal/kibana/settings').as('saveSettings');
    cy.contains('Save changes').click();
    cy.wait('@saveSettings').its('response.statusCode').should('eq', 200);
  });
};

const getUnableToModifyCase = () => {
  it('should not be able to modify settings', () => {
    cy.visitKibana(basePath);
    const button = cy.get('button[name="Inspect ES queries"]');
    button.should('be.disabled');
    cy.contains('Save changes').should('not.exist');
  });
};

describe('General Settings', () => {
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
