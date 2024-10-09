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
    cy.contains('General settings');
    const button = cy.get('button[name="Inspect ES queries"]');
    button.should('not.be.disabled');
    button.click();
    cy.contains('Save changes');
  });
};

const getUnableToModifyCase = () => {
  return it('should not be able to modify settings', () => {
    cy.visitKibana(basePath);
    cy.contains('General settings');
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

  // beforeEach(() => {
  //   cy.loginAsEditorUser();
  //   deleteAllCustomLinks();
  // });

  // it('shows empty message and create button', () => {
  //   cy.visitKibana(basePath);
  //   cy.contains('No links found');
  //   cy.contains('Create custom link');
  // });

  // it('creates custom link', () => {
  //   cy.visitKibana(basePath);
  //   const emptyPrompt = cy.getByTestSubj('customLinksEmptyPrompt');
  //   cy.contains('Create custom link').click();
  //   cy.contains('Create link');
  //   cy.contains('Save').should('be.disabled');
  //   cy.get('input[name="label"]').type('foo');
  //   cy.get('input[name="url"]').type('https://foo.com');
  //   cy.contains('Save').should('not.be.disabled');
  //   cy.contains('Save').click();
  //   emptyPrompt.should('not.exist');
  //   cy.contains('foo');
  //   cy.contains('https://foo.com');
  //   cy.getByTestSubj('editCustomLink').click();
  //   cy.contains('Delete').click();
  // });

  // it('clears filter values when field is selected', () => {
  //   cy.visitKibana(basePath);

  //   // wait for empty prompt
  //   cy.getByTestSubj('customLinksEmptyPrompt').should('be.visible');

  //   cy.contains('Create custom link').click();
  //   cy.getByTestSubj('filter-0').select('service.name');
  //   cy.get('[data-test-subj="service.name.value"] [data-test-subj="comboBoxSearchInput"]').type(
  //     'foo'
  //   );
  //   cy.getByTestSubj('filter-0').select('service.environment');
  //   cy.get('[data-test-subj="service.environment.value"] [data-test-subj="comboBoxInput"]').should(
  //     'not.contain',
  //     'foo'
  //   );
  // });
});
