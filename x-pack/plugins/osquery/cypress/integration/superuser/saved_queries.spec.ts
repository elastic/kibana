/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import {
  checkResults,
  DEFAULT_QUERY,
  deleteAndConfirm,
  findFormFieldByRowsLabelAndType,
  inputQuery,
  selectAllAgents,
  submitQuery,
} from '../../tasks/live_query';
import { login } from '../../tasks/login';

describe('Super User - Saved queries', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';
  const SAVED_QUERY_DESCRIPTION = 'Saved Query Description';

  beforeEach(() => {
    login();
    navigateTo('/app/osquery');
  });

  it('should save the query and check  if hidden columns and full screen stays open on page change', () => {
    cy.contains('New live query').click();
    selectAllAgents();
    inputQuery(DEFAULT_QUERY);
    submitQuery();
    checkResults();
    cy.get('[data-test-subj="dataGridFullScreenButton"]').trigger('mouseover');
    cy.contains(/Full screen$/).should('exist');
    cy.contains('Exit full screen').should('not.exist');
    cy.get('[data-test-subj="dataGridFullScreenButton"]').click();

    cy.get('[data-test-subj="dataGridFullScreenButton"]').trigger('mouseover');
    cy.contains(/Full screen$/).should('not.exist');
    cy.contains('Exit full screen').should('exist');

    cy.react('EuiDataGridHeaderCellWrapper', { props: { id: 'osquery.cmdline' } }).click();
    cy.contains(/Hide column$/).click();
    cy.react('EuiDataGridHeaderCellWrapper', {
      props: { id: 'osquery.disk_bytes_written.number' },
    }).click();
    cy.contains(/Hide column$/).click();
    cy.contains('2 columns hidden').should('exist');
    cy.get('[data-test-subj="pagination-button-next"]').click().wait(500).click();
    cy.contains('2 columns hidden').should('exist');

    cy.get('[data-test-subj="dataGridFullScreenButton"]').trigger('mouseover');
    cy.contains(/Full screen$/).should('not.exist');
    cy.contains('Exit full screen').should('exist');
    cy.get('[data-test-subj="dataGridFullScreenButton"]').click();

    cy.get('[data-test-subj="dataGridFullScreenButton"]').trigger('mouseover');
    cy.contains(/Full screen$/).should('exist');
    cy.contains('Exit full screen').should('not.exist');
    cy.contains('Save for later').click();
    cy.contains('Save query');
    findFormFieldByRowsLabelAndType('ID', SAVED_QUERY_ID);
    findFormFieldByRowsLabelAndType('Description', SAVED_QUERY_DESCRIPTION);
    cy.react('EuiButtonDisplay').contains('Save').click();
  });

  it('should view query details in status', () => {
    cy.contains('New live query');
    cy.react('ActionTableResultsButton').first().click();
    cy.wait(1000);
    cy.contains(DEFAULT_QUERY);
    checkResults();
    cy.react('EuiTab', { props: { id: 'status' } }).click();
    cy.wait(1000);
    cy.react('EuiTableRow').should('have.lengthOf', 1);
    cy.contains('Successful').siblings().contains(1);
  });

  it('should display a previously saved query and run it', () => {
    cy.contains('Saved queries').click();
    cy.contains(SAVED_QUERY_ID);
    cy.react('PlayButtonComponent', {
      props: { savedQuery: { attributes: { id: SAVED_QUERY_ID } } },
    }).click();
    selectAllAgents();
    submitQuery();
  });

  it('should edit the saved query', () => {
    cy.contains('Saved queries').click();
    cy.contains(SAVED_QUERY_ID);
    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
    }).click();
    findFormFieldByRowsLabelAndType('Description', ' Edited');
    cy.react('EuiButton').contains('Update query').click();
    cy.contains(`${SAVED_QUERY_DESCRIPTION} Edited`);
  });

  it('should delete the saved query', () => {
    cy.contains('Saved queries').click();
    cy.contains(SAVED_QUERY_ID);
    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
    }).click();
    deleteAndConfirm('query');
    cy.contains(SAVED_QUERY_ID);
  });
});
