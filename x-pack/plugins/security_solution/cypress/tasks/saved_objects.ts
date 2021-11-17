/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const importCase = (casePath: string) => {
  cy.get('[data-test-subj="importObjects"]').click();
  cy.get('.euiFilePicker__input')
    .trigger('click', { force: true })
    .attachFile(casePath)
    .trigger('change');
  cy.get('[data-test-subj="importSavedObjectsImportBtn"]').click({ force: true });
  cy.get('[data-test-subj="importSavedObjectsImportBtn"]').should('not.exist');
};
