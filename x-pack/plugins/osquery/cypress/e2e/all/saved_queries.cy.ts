/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { getSavedQueriesComplexTest } from '../../tasks/saved_queries';
import { loadCase, cleanupCase, loadPack, cleanupPack } from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';

describe('ALL - Saved queries', { tags: ['@ess', '@serverless'] }, () => {
  let caseId: string;

  before(() => {
    loadCase('securitySolution').then((caseInfo) => {
      caseId = caseInfo.id;
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    navigateTo('/app/osquery');
  });

  after(() => {
    cleanupCase(caseId);
  });

  getSavedQueriesComplexTest();

  it.skip('checks that user cant add a saved query with an ID that already exists', () => {
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

  describe('prebuilt', () => {
    let packName: string;
    let packId: string;

    before(() => {
      loadPack({
        queries: {
          test: {
            interval: 10,
            query: 'select * from uptime;',
            ecs_mapping: {},
          },
        },
      }).then((data) => {
        packId = data.saved_object_id;
        packName = data.name;
      });
    });

    beforeEach(() => {
      navigateTo('/app/osquery/saved_queries');
      cy.getBySel('tablePaginationPopoverButton').click();
      cy.getBySel('tablePagination-50-rows').click();
    });

    after(() => {
      cleanupPack(packId);
    });

    it('checks result type on prebuilt saved query', () => {
      cy.react('CustomItemAction', {
        props: { index: 1, item: { id: 'users_elastic' } },
      }).click();
      cy.getBySel('resultsTypeField').within(() => {
        cy.contains('Snapshot');
      });
    });

    it('user can run prebuilt saved query and add to case', () => {
      cy.react('PlayButtonComponent', {
        props: { savedQuery: { id: 'users_elastic' } },
      }).click();

      selectAllAgents();
      submitQuery();
      checkResults();
      addToCase(caseId);
      viewRecentCaseAndCheckResults();
    });

    it('user cant delete prebuilt saved query', () => {
      cy.react('CustomItemAction', {
        props: { index: 1, item: { id: 'users_elastic' } },
      }).click();
      cy.contains('Delete query').should('not.exist');
      navigateTo('/app/osquery/saved_queries');

      cy.contains('Add saved query').click();
      inputQuery('test');
      findFormFieldByRowsLabelAndType('ID', 'query-to-delete');
      cy.contains('Save query').click();
      cy.react('CustomItemAction', {
        props: { index: 1, item: { id: 'query-to-delete' } },
      }).click();
      deleteAndConfirm('query');
    });

    it('user can edit prebuilt saved query under pack', () => {
      preparePack(packName);
      findAndClickButton('Edit');
      cy.contains(`Edit ${packName}`);
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
