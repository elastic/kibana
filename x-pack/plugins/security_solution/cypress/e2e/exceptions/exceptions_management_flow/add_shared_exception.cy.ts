/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanKibana } from '../../../tasks/common';
import { getExceptionList } from '../../../objects/exception';
import { EXCEPTIONS_TABLE_SHOWING_LISTS } from '../../../screens/exceptions';
import { createExceptionList, deleteExceptionList } from '../../../tasks/api_calls/exceptions';
import { visitWithoutDateRange } from '../../../tasks/login';
import { EXCEPTIONS_URL } from '../../../urls/navigation';

describe('Shared exception lists - add single exception item', () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    deleteExceptionList(getExceptionList().list_id, getExceptionList().namespace_type);

    // Create exception list not used by any rules
    createExceptionList(getExceptionList(), getExceptionList().list_id);

    visitWithoutDateRange(EXCEPTIONS_URL);

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
  });

  context('When a user clicks Add Exception Item on the create drop down', () => {
    it('Field has value autosuggested', () => {
      cy.get('[data-test-subj="manageExceptionListCreateButton"]').click();
      cy.contains('Create exception item').click();
      cy.get('[data-test-subj="fieldAutocompleteComboBox"]').click().type('agent.type{enter}');
      cy.get('[data-test-subj="valuesAutocompleteMatch"]').click();
      cy.get('[data-test-subj="valuesAutocompleteMatch"]').click();
      cy.get('[data-test-subj="valuesAutocompleteMatch"]').click();
      cy.get('[data-test-subj="valuesAutocompleteMatch"]').click();
      cy.get('[data-test-subj="valuesAutocompleteMatch"]').type(
        '{downarrow}{enter}{downarrow}{enter}'
      );
      cy.contains('[data-test-subj="valuesAutocompleteMatch"]', 'auditbeat');
    });
  });
});
