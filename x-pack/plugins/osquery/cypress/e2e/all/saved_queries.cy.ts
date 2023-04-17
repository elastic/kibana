/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { preparePack } from '../../tasks/packs';
import {
  addToCase,
  checkResults,
  deleteAndConfirm,
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  inputQuery,
  selectAllAgents,
  submitQuery,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { navigateTo } from '../../tasks/navigation';

import { login } from '../../tasks/login';
import { ROLES } from '../../test';
import { getSavedQueriesComplexTest } from '../../tasks/saved_queries';
import { getRandomInt } from '../../tasks/helpers';

describe('ALL - Saved queries', () => {
  const randomNumber = getRandomInt();
  const SAVED_QUERY_ID = `Saved-Query-Id-${randomNumber}`;
  const SAVED_QUERY_DESCRIPTION = `Test saved query description ${randomNumber}`;

  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'case_security');
  });

  beforeEach(() => {
    login(ROLES.soc_manager);
    navigateTo('/app/osquery');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'case_security');
  });

  getSavedQueriesComplexTest(SAVED_QUERY_ID, SAVED_QUERY_DESCRIPTION);

  it('checks that user cant add a saved query with an ID that already exists', () => {
    cy.contains('Saved queries').click();
    cy.contains('Add saved query').click();

    findFormFieldByRowsLabelAndType('ID', 'users_elastic');
    cy.contains('ID must be unique').should('not.exist');
    inputQuery('test');
    cy.contains('Save query').click();
    cy.contains('ID must be unique').should('exist');
  });

  it('checks default values on new saved query', () => {
    cy.contains('Saved queries').click();
    cy.contains('Add saved query').click();
    // ADD MORE FIELDS HERE
    cy.getBySel('resultsTypeField').within(() => {
      cy.contains('Snapshot');
    });
  });

  describe('prebuilt ', () => {
    before(() => {
      runKbnArchiverScript(ArchiverMethod.LOAD, 'pack_with_prebuilt_saved_queries');
    });

    beforeEach(() => {
      navigateTo('/app/osquery/saved_queries');
    });

    after(() => {
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'pack_with_prebuilt_saved_queries');
    });

    it('checks result type on prebuilt saved query', () => {
      cy.react('CustomItemAction', {
        props: { index: 1, item: { attributes: { id: 'users_elastic' } } },
      }).click();
      cy.getBySel('resultsTypeField').within(() => {
        cy.contains('Snapshot');
      });
    });

    it('user can run prebuilt saved query and add to case', () => {
      cy.react('PlayButtonComponent', {
        props: { savedQuery: { attributes: { id: 'users_elastic' } } },
      }).click();

      selectAllAgents();
      submitQuery();
      checkResults();
      addToCase();
      viewRecentCaseAndCheckResults();
    });

    it('user cant delete prebuilt saved query', () => {
      cy.react('CustomItemAction', {
        props: { index: 1, item: { attributes: { id: 'users_elastic' } } },
      }).click();
      cy.contains('Delete query').should('not.exist');
      navigateTo('/app/osquery/saved_queries');

      cy.contains('Add saved query').click();
      inputQuery('test');
      findFormFieldByRowsLabelAndType('ID', 'query-to-delete');
      cy.contains('Save query').click();
      cy.react('CustomItemAction', {
        props: { index: 1, item: { attributes: { id: 'query-to-delete' } } },
      }).click();
      deleteAndConfirm('query');
    });

    it('user can edit prebuilt saved query under pack', () => {
      const PACK_NAME = 'pack_with_prebuilt_sq';
      preparePack(PACK_NAME);
      findAndClickButton('Edit');
      cy.contains(`Edit ${PACK_NAME}`);
      findAndClickButton('Add query');
      cy.contains('Attach next query');

      cy.react('EuiComboBox', {
        props: { placeholder: 'Search for a query to run, or write a new query below' },
      })
        .click()
        .type('users_elastic{downArrow} {enter}');
      inputQuery('where name=1');
      cy.getBySel('resultsTypeField').click();
      cy.contains('Differential (Ignore removals)').click();
      cy.contains('Unique identifier of the us').should('exist');
      cy.contains('User ID').should('exist');

      cy.react('EuiFlyoutBody').within(() => {
        cy.getBySel('ECSMappingEditorForm')
          .first()
          .within(() => {
            cy.get(`[aria-label="Delete ECS mapping row"]`).first().click();
          });
      });
      cy.contains('Unique identifier of the us').should('not.exist');
      cy.contains('User ID').should('not.exist');
      // cy.contains('Save').click();
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();

      cy.react('CustomItemAction', {
        props: { index: 0, item: { id: 'users_elastic' } },
      }).click();
      cy.contains('SELECT * FROM users;where name=1');
      cy.contains('Unique identifier of the us.').should('not.exist');
      cy.contains('User ID').should('not.exist');
      cy.contains('Differential (Ignore removals)').should('exist');
      cy.react('EuiFlyoutFooter').react('EuiButtonEmpty').contains('Cancel').click();
    });
  });
});
