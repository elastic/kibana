/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESULTS_TABLE_BUTTON } from '../screens/live_query';
import { closeToastIfVisible, generateRandomStringName } from './integrations';
import {
  checkResults,
  BIG_QUERY,
  deleteAndConfirm,
  findFormFieldByRowsLabelAndType,
  inputQuery,
  selectAllAgents,
  submitQuery,
} from './live_query';
import { navigateTo } from './navigation';

export const getSavedQueriesComplexTest = () =>
  describe('Saved queries Complex Test', () => {
    const suffix = generateRandomStringName(1)[0];
    const savedQueryId = `Saved-Query-Id-${suffix}`;
    const savedQueryDescription = `Test saved query description ${suffix}`;

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
        cy.contains('columns hidden').should('not.exist');
        cy.react('EuiDataGridHeaderCellWrapper', { props: { id: 'osquery.cmdline' } }).click();
        cy.contains(/Hide column$/).click();
        cy.react('EuiDataGridHeaderCellWrapper', {
          props: { id: 'osquery.cwd' },
        }).click();
        cy.contains(/Hide column$/).click();
        cy.react('EuiDataGridHeaderCellWrapper', {
          props: { id: 'osquery.disk_bytes_written.number' },
        }).click();
        cy.contains(/Hide column$/).click();
        cy.contains('columns hidden').should('exist');
        // change pagination
        cy.getBySel('pagination-button-next').click().wait(500).click();
        cy.contains('columns hidden').should('exist');

        // enter fullscreen
        cy.getBySel(RESULTS_TABLE_BUTTON).trigger('mouseover');
        cy.contains(/Enter fullscreen$/).should('not.exist');
        cy.contains('Exit fullscreen').should('exist');
        cy.getBySel(RESULTS_TABLE_BUTTON).click();

        // sorting
        cy.react('EuiDataGridHeaderCellWrapper', {
          props: { id: 'osquery.egid' },
        }).click();
        cy.contains(/Sort A-Z$/).click();
        cy.contains('columns hidden').should('exist');
        cy.getBySel(RESULTS_TABLE_BUTTON).trigger('mouseover');
        cy.contains(/Enter fullscreen$/).should('exist');

        // visit Status results
        cy.react('EuiTab', { props: { id: 'status' } }).click();
        cy.react('EuiTableRow').should('have.lengthOf', 2);

        // save new query
        cy.contains('Exit full screen').should('not.exist');
        cy.contains('Save for later').click();
        cy.contains('Save query');
        findFormFieldByRowsLabelAndType('ID', savedQueryId);
        findFormFieldByRowsLabelAndType('Description (optional)', savedQueryDescription);
        cy.getBySel('savedQueryFlyoutSaveButton').click();
        cy.contains('Successfully saved');
        closeToastIfVisible();

        // play saved query
        navigateTo('/app/osquery/saved_queries');
        cy.contains(savedQueryId);
        cy.react('PlayButtonComponent', {
          props: { savedQuery: { id: savedQueryId } },
        }).click();
        selectAllAgents();
        submitQuery();

        // edit saved query
        cy.contains('Saved queries').click();
        cy.contains(savedQueryId);
        cy.react('CustomItemAction', {
          props: { index: 1, item: { id: savedQueryId } },
        }).click();
        findFormFieldByRowsLabelAndType('Description (optional)', ' Edited');
        // Run in test configuration
        cy.contains('Test configuration').click();
        selectAllAgents();
        submitQuery();
        checkResults();

        // Disabled submit button in test configuration
        cy.contains('Submit').should('not.be.disabled');
        cy.getBySel('osquery-save-query-flyout').within(() => {
          cy.contains('Query is a required field').should('not.exist');
          // this clears the input
          inputQuery('{selectall}{backspace}{selectall}{backspace}');
          cy.contains('Query is a required field');
          inputQuery(BIG_QUERY);
          cy.contains('Query is a required field').should('not.exist');
        });

        // Save edited
        cy.getBySel('euiFlyoutCloseButton').click();
        cy.getBySel('savedQueryFormUpdateButton').click();
        cy.contains(`${savedQueryDescription} Edited`);

        // delete saved query
        cy.contains(savedQueryId);
        cy.react('CustomItemAction', {
          props: { index: 1, item: { id: savedQueryId } },
        }).click();
        deleteAndConfirm('query');
        cy.contains(savedQueryId).should('exist');
        cy.contains(savedQueryId).should('not.exist');
      }
    );
  });
