/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const basePath = '/app/apm/settings/custom-links';

const deleteAllCustomLinks = () => {
  // delete customLink if exists
  const kibanaUrl = Cypress.env('KIBANA_URL');
  cy.request({
    log: false,
    method: 'GET',
    url: `${kibanaUrl}/internal/apm/settings/custom_links`,
    body: {},
    headers: {
      'kbn-xsrf': 'e2e_test',
    },
    auth: { user: 'editor', pass: 'changeme' },
  }).then((response) => {
    const promises = response.body.customLinks.map((item: any) => {
      if (item.id) {
        return cy.request({
          log: false,
          method: 'DELETE',
          url: `${kibanaUrl}/internal/apm/settings/custom_links/${item.id}`,
          body: {},
          headers: {
            'kbn-xsrf': 'e2e_test',
          },
          auth: { user: 'editor', pass: 'changeme' },
          failOnStatusCode: false,
        });
      }
    });
    return Promise.all(promises);
  });
};

describe('Custom links', () => {
  before(() => {
    deleteAllCustomLinks();
  });

  describe('when logged in as a viewer with write settings access', () => {
    beforeEach(() => {
      cy.loginAsApmReadPrivilegesWithWriteSettingsUser();
    });

    it('shows empty message and create button', () => {
      cy.visitKibana(basePath);
      cy.contains('No links found');
      cy.contains('Create custom link').should('be.not.disabled');
    });

    it('creates custom link', () => {
      cy.visitKibana(basePath);
      const emptyPrompt = cy.getByTestSubj('customLinksEmptyPrompt');
      cy.contains('Create custom link').click();
      cy.contains('Create link');
      cy.contains('Save').should('be.disabled');
      cy.get('input[name="label"]').type('foo');
      cy.get('input[name="url"]').type('https://foo.com');
      cy.contains('Save').should('not.be.disabled');
      cy.contains('Save').click();
      emptyPrompt.should('not.exist');
      cy.contains('foo');
      cy.contains('https://foo.com');
    });
  });

  describe('when logged in as a viewer', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    it('shows disabled create button and edit button', () => {
      cy.visitKibana(basePath);
      cy.contains('Create custom link').should('be.disabled');
      cy.getByTestSubj('editCustomLink').should('not.exist');
    });
  });

  describe('when logged in as an editor without write settings access', () => {
    beforeEach(() => {
      cy.loginAsApmAllPrivilegesWithoutWriteSettingsUser();
    });

    it('shows disabled create button and edit button', () => {
      cy.visitKibana(basePath);
      cy.contains('Create custom link').should('be.disabled');
      cy.getByTestSubj('editCustomLink').should('not.exist');
    });
  });

  describe('when logged in as an editor', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
    });

    it('shows create button', () => {
      cy.visitKibana(basePath);
      cy.contains('Create custom link').should('not.be.disabled');
    });

    it('deletes custom link', () => {
      cy.visitKibana(basePath);
      cy.getByTestSubj('editCustomLink').click();
      cy.contains('Delete').click();
    });

    it('clears filter values when field is selected', () => {
      cy.visitKibana(basePath);

      // wait for empty prompt
      cy.getByTestSubj('customLinksEmptyPrompt').should('be.visible');

      cy.contains('Create custom link').click();
      cy.getByTestSubj('filter-0').select('service.name');
      cy.get('[data-test-subj="service.name.value"] [data-test-subj="comboBoxSearchInput"]').type(
        'foo'
      );
      cy.getByTestSubj('filter-0').select('service.environment');
      cy.get(
        '[data-test-subj="service.environment.value"] [data-test-subj="comboBoxInput"]'
      ).should('not.contain', 'foo');
    });
  });
});
