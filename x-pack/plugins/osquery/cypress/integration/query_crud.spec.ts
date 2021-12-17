/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../tasks/navigation';
import {
  checkResults,
  DEFAULT_QUERY,
  inputQuery,
  selectAllAgents,
  submitQuery,
} from '../tasks/live_query';
import { login } from '../tasks/login';

describe('Osquery works as CRUD', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';
  const SAVED_QUERY_DESCRIPTION = 'Saved Query Description';

  beforeEach(() => {
    login();
  });

  describe('Saved queries', () => {
    beforeEach(() => {
      navigateTo('/app/osquery');
      cy.waitForReact(1000);
    });

    it('should save the query', () => {
      cy.wait(1000);
      cy.contains('New live query').click();
      selectAllAgents();
      inputQuery(DEFAULT_QUERY);
      submitQuery();
      checkResults();
      cy.contains('Save for later').click();
      cy.contains('Save query');
      cy.react('EuiFormRow', { props: { label: 'ID' } }).type(SAVED_QUERY_ID);
      cy.react('EuiFormRow', { props: { label: 'Description' } }).type(SAVED_QUERY_DESCRIPTION);
      cy.react('EuiButtonDisplay').contains('Save').click();
    });

    it('should view query details ', () => {
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

    it('should see a previously saved query and play it', () => {
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
      cy.react('EuiFormRow', { props: { label: 'Description' } }).type(' Edited');
      cy.react('EuiButton').contains('Update query').click();
      cy.contains(`${SAVED_QUERY_DESCRIPTION} Edited`);
    });

    it('should delete the saved query', () => {
      cy.contains('Saved queries').click();
      cy.contains(SAVED_QUERY_ID);
      cy.react('CustomItemAction', {
        props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
      }).click();
      cy.react('EuiButton').contains('Delete query').click();
      cy.contains('Are you sure you want to delete this query?');
      cy.react('EuiButton').contains('Confirm').click();
      cy.contains(SAVED_QUERY_ID);
    });
  });

  describe('Packs', () => {
    const PACK_NAME = 'Pack-name';
    beforeEach(() => {
      navigateTo('/app/osquery');
      cy.waitForReact(1000);
    });
    it('should create a saved query', () => {
      cy.wait(1000);
      cy.contains('New live query').click();
      selectAllAgents();
      inputQuery(DEFAULT_QUERY);
      submitQuery();
      checkResults();
      cy.contains('Save for later').click();
      cy.contains('Save query');
      cy.react('EuiFormRow', { props: { label: 'ID' } }).type(SAVED_QUERY_ID);
      cy.react('EuiFormRow', { props: { label: 'Description' } }).type(SAVED_QUERY_DESCRIPTION);
      cy.react('EuiButtonDisplay').contains('Save').click();
    });

    it('should add a pack from a saved query', () => {
      cy.contains('Packs').click();
      cy.react('EuiButton').contains('Add pack').click();
      cy.react('EuiFormRow', { props: { label: 'Name' } }).type(PACK_NAME);
      cy.react('EuiFormRow', { props: { label: 'Description (optional)' } }).type(
        'Pack description'
      );
      cy.react('EuiFormRow', { props: { label: 'Scheduled agent policies (optional)' } }).type(
        'Default Fleet Server policy'
      );
      cy.react('List').first().click();
      cy.react('EuiButton').contains('Add query').click();
      cy.contains('Attach next query');
      cy.react('EuiComboBox', { props: { placeholder: 'Search for saved queries' } })
        .click()
        .type(SAVED_QUERY_ID);
      cy.react('List').first().click();
      cy.react('EuiFormRow', { props: { label: 'Interval (s)' } })
        .click()
        .clear()
        .type('1800');
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.react('EuiTableRow').contains(SAVED_QUERY_ID);
      cy.react('EuiButton').contains('Save pack').click();
      cy.contains('Save and deploy changes');
      cy.react('EuiButton').contains('Save and deploy changes').click();
      cy.contains(PACK_NAME);
    });
    describe('should be editable', () => {
      beforeEach(() => {
        cy.contains('Packs').click();
        const createdPack = cy.contains(PACK_NAME);
        createdPack.click();
        cy.react('EuiTableRow').contains(SAVED_QUERY_ID);
      });
      it('by clicking the edit button', () => {
        const NEW_QUERY_NAME = 'new-query-name';
        cy.react('EuiButton').contains('Edit').click();
        cy.contains(`Edit ${PACK_NAME}`);
        cy.react('EuiButton').contains('Add query').click();
        cy.contains('Attach next query');
        inputQuery('select * from uptime');
        cy.react('EuiFormRow', { props: { label: 'ID' } }).type(NEW_QUERY_NAME);
        cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
        cy.react('EuiTableRow').contains(NEW_QUERY_NAME);
        cy.react('EuiButton').contains('Update pack').click();
        cy.contains('Save and deploy changes');
        cy.react('EuiButton').contains('Save and deploy changes').click();
      });
      it('by clicking in Discovery button', () => {
        cy.react('CustomItemAction', {
          props: { index: 0, item: { id: SAVED_QUERY_ID } },
        }).click();
        cy.get('[data-test-subj="discoverDocTable"]').contains(
          `pack_${PACK_NAME}_${SAVED_QUERY_ID}`
        );
      });
      // it('by clicking in Lens button', () => {
      //   cy.react('CustomItemAction', {
      //     props: { index: 1, item: { id: SAVED_QUERY_ID } },
      //   }).click();
      //   cy.get('[data-test-subj="lnsWorkspace"]');
      //   cy.get('[data-test-subj="breadcrumbs"]').contains(
      //     `Action pack_${PACK_NAME}_${SAVED_QUERY_ID} results`
      //   );
      // });
      it('by clicking the delete button', () => {
        cy.react('EuiButton').contains('Edit').click();
        cy.react('EuiButton').contains('Delete pack').click();
        cy.contains('Are you sure you want to delete this pack?');
        cy.react('EuiButton').contains('Confirm').click();
      });
    });
  });
});
