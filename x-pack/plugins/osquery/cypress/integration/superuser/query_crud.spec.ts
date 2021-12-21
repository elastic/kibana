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
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  inputQuery,
  selectAllAgents,
  submitQuery,
} from '../../tasks/live_query';
import { login } from '../../tasks/login';

describe('SU - Osquery works as CRUD for', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';
  const SAVED_QUERY_DESCRIPTION = 'Saved Query Description';

  beforeEach(() => {
    login();
  });

  describe('saved queries:', () => {
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
      findFormFieldByRowsLabelAndType('ID', SAVED_QUERY_ID);
      findFormFieldByRowsLabelAndType('Description', SAVED_QUERY_DESCRIPTION);
      findAndClickButton('Save');
    });

    it('should add a pack from a saved query', () => {
      cy.contains('Packs').click();
      findAndClickButton('Add pack');
      findFormFieldByRowsLabelAndType('Name', PACK_NAME);
      findFormFieldByRowsLabelAndType('Description (optional)', 'Pack description');
      findFormFieldByRowsLabelAndType(
        'Scheduled agent policies (optional)',
        'Default Fleet Server policy'
      );
      cy.react('List').first().click();
      findAndClickButton('Add query');
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
      findAndClickButton('Save pack');
      cy.contains('Save and deploy changes');
      findAndClickButton('Save and deploy changes');
      cy.contains(PACK_NAME);
    });
    describe('should be editable', () => {
      const NEW_QUERY_NAME = 'new-query-name';

      beforeEach(() => {
        cy.contains('Packs').click();
        const createdPack = cy.contains(PACK_NAME);
        createdPack.click();
        cy.react('EuiTableRow').contains(SAVED_QUERY_ID);
      });
      it('by clicking the edit button', () => {
        findAndClickButton('Edit');
        cy.contains(`Edit ${PACK_NAME}`);
        findAndClickButton('Add query');
        cy.contains('Attach next query');
        inputQuery('select * from uptime');
        findFormFieldByRowsLabelAndType('ID', NEW_QUERY_NAME);
        cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
        cy.react('EuiTableRow').contains(NEW_QUERY_NAME);
        findAndClickButton('Update pack');
        cy.contains('Save and deploy changes');
        findAndClickButton('Save and deploy changes');
      });
      it('by clicking in Discovery button', () => {
        cy.react('CustomItemAction', {
          props: { index: 0, item: { id: NEW_QUERY_NAME } },
        }).click();
        cy.get('[data-test-subj="discoverDocTable"]').contains(
          `pack_${PACK_NAME}_${NEW_QUERY_NAME}`
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
        findAndClickButton('Edit');
        deleteAndConfirm('pack');
      });
    });
  });
});
