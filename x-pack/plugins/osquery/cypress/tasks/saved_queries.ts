/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESULTS_TABLE_BUTTON } from '../screens/live_query';
import {
  checkResults,
  BIG_QUERY,
  deleteAndConfirm,
  findFormFieldByRowsLabelAndType,
  inputQuery,
  selectAllAgents,
  submitQuery,
} from './live_query';

export const getSavedQueriesComplexTest = (savedQueryId: string, savedQueryDescription: string) =>
  it(
    'should create a new query and verify: \n ' +
      '- hidden columns, full screen and sorting \n' +
      '- pagination \n' +
      '- query can viewed (status), edited and deleted ',
    () => {
      cy.contains('New live query').click();
      selectAllAgents();
      inputQuery(BIG_QUERY);
      submitQuery();
      checkResults();
      // enter fullscreen
      cy.getBySel(RESULTS_TABLE_BUTTON).trigger('mouseover');
      cy.contains(/Enter fullscreen$/).should('exist');
      cy.contains('Exit fullscreen').should('not.exist');
      cy.getBySel(RESULTS_TABLE_BUTTON).click();

      cy.getBySel(RESULTS_TABLE_BUTTON).trigger('mouseover');
      cy.contains(/Enter Fullscreen$/).should('not.exist');
      cy.contains('Exit fullscreen').should('exist');

      // hidden columns
      cy.react('EuiDataGridHeaderCellWrapper', { props: { id: 'osquery.cmdline' } }).click();
      cy.contains(/Hide column$/).click();
      cy.react('EuiDataGridHeaderCellWrapper', {
        props: { id: 'osquery.disk_bytes_written.number' },
      }).click();
      cy.contains(/Hide column$/).click();
      cy.contains('2 columns hidden').should('exist');
      // change pagination
      cy.getBySel('pagination-button-next').click().wait(500).click();
      cy.contains('2 columns hidden').should('exist');

      cy.getBySel(RESULTS_TABLE_BUTTON).trigger('mouseover');
      cy.contains(/Enter fullscreen$/).should('not.exist');
      cy.contains('Exit fullscreen').should('exist');
      cy.getBySel(RESULTS_TABLE_BUTTON).click();

      // sorting
      cy.react('EuiDataGridHeaderCellWrapper', {
        props: { id: 'osquery.egid' },
      }).click();
      cy.contains(/Sort A-Z$/).click();
      cy.contains('2 columns hidden').should('exist');
      cy.getBySel(RESULTS_TABLE_BUTTON).trigger('mouseover');
      cy.contains(/Enter fullscreen$/).should('exist');

      // save new query
      cy.contains('Exit full screen').should('not.exist');
      cy.contains('Save for later').click();
      cy.contains('Save query');
      findFormFieldByRowsLabelAndType('ID', savedQueryId);
      findFormFieldByRowsLabelAndType('Description (optional)', savedQueryDescription);
      cy.react('EuiButtonDisplay').contains('Save').click();

      // visit Status results
      cy.react('EuiTab', { props: { id: 'status' } }).click();
      cy.react('EuiTableRow').should('have.lengthOf', 1);
      cy.contains('Successful').siblings().contains(1);

      // play saved query
      cy.contains('Saved queries').click();
      cy.contains(savedQueryId);
      cy.react('PlayButtonComponent', {
        props: { savedQuery: { attributes: { id: savedQueryId } } },
      }).click();
      selectAllAgents();
      submitQuery();

      // edit saved query
      cy.contains('Saved queries').click();
      cy.contains(savedQueryId);
      cy.react('CustomItemAction', {
        props: { index: 1, item: { attributes: { id: savedQueryId } } },
      }).click();
      findFormFieldByRowsLabelAndType('Description (optional)', ' Edited');
      // Run in test configuration
      cy.contains('Test configuration').click();
      selectAllAgents();
      submitQuery();
      checkResults();

      // Save edited
      cy.react('EuiButton').contains('Update query').click();
      cy.contains(`${savedQueryDescription} Edited`);

      // delete saved query
      cy.contains(savedQueryId);
      cy.react('CustomItemAction', {
        props: { index: 1, item: { attributes: { id: savedQueryId } } },
      }).click();
      deleteAndConfirm('query');
      cy.contains(savedQueryId).should('exist');
      cy.contains(savedQueryId).should('not.exist');
    }
  );
