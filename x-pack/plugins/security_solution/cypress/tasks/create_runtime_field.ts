/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CREATE_FIELD_BUTTON,
  RUNTIME_FIELD_INPUT,
  SAVE_FIELD_BUTTON,
} from '../screens/create_runtime_field';

export const createField = (fieldName: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  cy.get(CREATE_FIELD_BUTTON).click();
  cy.get(RUNTIME_FIELD_INPUT).type(fieldName);
  return cy.get(SAVE_FIELD_BUTTON).click();
};

export const assertFieldDisplayed = (fieldName: string, view: 'alerts' | 'timeline' = 'timeline') =>
  view === 'alerts'
    ? cy
        .get(
          `[data-test-subj="events-viewer-panel"] [data-test-subj="dataGridHeaderCell-${fieldName}"]`
        )
        .should('exist')
    : cy
        .get(`[data-test-subj="timeline"] [data-test-subj="header-text-${fieldName}"]`)
        .should('exist');
