/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps';
import { loginAndWaitForPage } from '../../integration/helpers';

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 60 * 1000;

Given(`a user browses the APM UI application`, () => {
  // Open service inventory page
  loginAndWaitForPage(`/app/apm/services`, {
    from: '2020-06-01T14:59:32.686Z',
    to: '2020-06-16T16:59:36.219Z',
  });
});

Given(`a user browses the APM UI settings page`, () => {
  // Open service inventory page
  loginAndWaitForPage(`/app/apm/settings`, {
    from: '2020-06-01T14:59:32.686Z',
    to: '2020-06-16T16:59:36.219Z',
  });
});

When(`the user inspects the opbeans-node service`, () => {
  // click opbeans-node service
  cy.get(':contains(opbeans-node)', { timeout: DEFAULT_TIMEOUT })
    .last()
    .click({ force: true });
});

Then(`should redirect to correct service overview page`, () => {
  cy.url().should('contain', `/app/apm/services/opbeans-node/overview`);
});

const newIndexPattern = 'new-index-*';
const indicesFieldTestName = [
  'sourcemapIndice',
  'errorIndices',
  'onboardingIndices',
  'spanIndices',
  'transactionIndices',
  'metricsIndices',
];
When(`the user updates APM indices`, () => {
  cy.contains('Indices').click();
  cy.url().should('include', 'apm-indices');
  cy.contains('Apply changes').should('not.be.disabled');

  indicesFieldTestName.map((fieldTestName) => {
    cy.get(`[data-test-subj="${fieldTestName}"]`).type(newIndexPattern);
  });
  cy.contains('Apply changes').click();
});

Then(`default indices were updated`, () => {
  cy.contains('Indices applied');
  indicesFieldTestName.map((fieldTestName) => {
    cy.get(`[data-test-subj="${fieldTestName}"]`).should(
      'have.value',
      newIndexPattern
    );
  });
});

Then(`reset indices`, () => {
  indicesFieldTestName.map((fieldTestName) => {
    cy.get(`[data-test-subj="${fieldTestName}"]`).clear();
  });
  cy.contains('Apply changes').click();
  cy.contains('Indices applied');
});

When(`the user creates a custom link`, () => {
  cy.get('.euiToast__closeButton').click();
  cy.contains('Customize app').click();
  cy.contains('Custom Links');
  cy.contains('No links found');
  cy.contains('Create custom link').click();
  cy.contains('Create link');
  cy.get('[data-test-subj="saveButton"]').should('be.disabled');

  cy.get('[data-test-subj="label"]').type('Service overview');
  cy.get('[data-test-subj="url"]').type(
    'https://elastic/app/apm/services/{{service.name}}/overview',
    {
      parseSpecialCharSequences: false,
    }
  );

  cy.get('[data-test-subj="filter-0"]').select('service.name');
  cy.get('[data-test-subj="service.name.value"]').type('opbeans-node');

  cy.contains('https://elastic/app/apm/services/opbeans-node/overview');

  cy.get('[data-test-subj="saveButton"]').click();
});

Then('a new custom link is shown in the table', () => {
  cy.contains('Link saved!');
  cy.contains('Service overview');
  cy.contains('https://elastic/app/apm/services/{{service.name}}/overview');
});

When('the user edits a custom link', () => {
  cy.request({
    method: 'POST',
    url: 'http://localhost:5701/api/apm/settings/custom_links',
    body: {
      label: 'Service overview',
      url: 'https://elastic/app/apm/services/{{service.name}}/overview',
      filters: [{ key: 'service.name', value: 'opbeans-node' }],
    },
    auth: {
      user: 'admin',
      pass: 'changeme',
    },
    headers: {
      'kbn-version': '8.0.0',
    },
  });

  cy.get('.euiToast__closeButton').click();
  cy.contains('Customize app').click();
  cy.contains('Custom Links');
  cy.contains('Service overview');
  cy.get('.euiTableRowCell--hasActions .euiButtonIcon').click();
  cy.get('[data-test-subj="label"]').clear().type('Edited Service overview');
  cy.get('[data-test-subj="saveButton"]').click();
});

Then('custom link was edited', () => {
  cy.contains('Link saved!');
  cy.contains('Edited Service overview');
  cy.contains('https://elastic/app/apm/services/{{service.name}}/overview');
});

Then('delete custom link', () => {
  cy.get('.euiToast__closeButton').click();
  cy.get('.euiTableRowCell--hasActions .euiButtonIcon').click();
  cy.contains('Delete').click();
  cy.contains('Deleted custom link.');
});
