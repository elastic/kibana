/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Case } from '../objects/case';
import { TITLE_INPUT, TAGS_INPUT, DESCRIPTION_INPUT } from '../screens/create_new_case';

export const createNewCase = (newCase: Case) => {
  cy.get(TITLE_INPUT).type(newCase.title, { force: true });
  newCase.tags.forEach(tag => {
    cy.get(TAGS_INPUT).type(`${tag}{enter}`, { force: true });
  });
  cy.get(DESCRIPTION_INPUT).type(`${newCase.description} `, { force: true });
  cy.get('[data-test-subj="insert-timeline-button"]').click({ force: true });
  cy.get('[data-test-subj="timeline-super-select-search-box"]').type('SIEM test{enter}');
  cy.get('[data-test-subj="timeline"]').should('be.visible');
  cy.get('[data-test-subj="timeline"]')
    .eq(1)
    .click({ force: true });
  cy.get('[data-test-subj="create-case-submit"]').click({ force: true });
  cy.get('[data-test-subj="create-case-loading-spinner"]').should('exist');
  cy.get('[data-test-subj="create-case-loading-spinner"]').should('not.exist');
};
