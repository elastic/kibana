/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIVE_QUERY_EDITOR } from '../../screens/live_query';
import {
  ADD_QUERY_BUTTON,
  customActionEditSavedQuerySelector,
  customActionRunSavedQuerySelector,
  EDIT_PACK_HEADER_BUTTON,
  SAVED_QUERY_DROPDOWN_SELECT,
} from '../../screens/packs';
import { preparePack } from '../../tasks/packs';
import {
  addToCase,
  checkResults,
  deleteAndConfirm,
  inputQuery,
  selectAllAgents,
  submitQuery,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { navigateTo } from '../../tasks/navigation';
import { getSavedQueriesComplexTest } from '../../tasks/saved_queries';
import {
  loadCase,
  cleanupCase,
  loadPack,
  cleanupPack,
  loadSavedQuery,
  cleanupSavedQuery,
} from '../../tasks/api_fixtures';
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
    cy.get('input[name="id"]').type(`users_elastic{downArrow}{enter}`);

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
    let savedQueryId: string;

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
      loadSavedQuery().then((data) => {
        savedQueryId = data.saved_object_id;
      });
    });

    beforeEach(() => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      navigateTo('/app/osquery/saved_queries');
      cy.getBySel('tablePaginationPopoverButton').click();
      cy.getBySel('tablePagination-50-rows').click();
    });

    after(() => {
      cleanupPack(packId);
      cleanupSavedQuery(savedQueryId);
    });

    it('checks result type on prebuilt saved query', () => {
      cy.get(customActionEditSavedQuerySelector('users_elastic')).click();
      cy.getBySel('resultsTypeField').within(() => {
        cy.contains('Snapshot');
      });
    });

    it('user can run prebuilt saved query and add to case', () => {
      cy.get(customActionRunSavedQuerySelector('users_elastic')).click();

      selectAllAgents();
      submitQuery();
      checkResults();
      addToCase(caseId);
      viewRecentCaseAndCheckResults();
    });

    it('user can not delete prebuilt saved query but can delete normal saved query', () => {
      cy.get(customActionEditSavedQuerySelector('users_elastic')).click();
      cy.contains('Delete query').should('not.exist');
      navigateTo(`/app/osquery/saved_queries/${savedQueryId}`);

      deleteAndConfirm('query');
    });

    it('user can edit prebuilt saved query under pack', () => {
      preparePack(packName);
      cy.getBySel(EDIT_PACK_HEADER_BUTTON).click();
      cy.contains(`Edit ${packName}`);
      cy.getBySel(ADD_QUERY_BUTTON).click();

      cy.contains('Attach next query');
      cy.getBySel('globalLoadingIndicator').should('not.exist');
      cy.getBySel(LIVE_QUERY_EDITOR).should('exist');
      cy.getBySel(SAVED_QUERY_DROPDOWN_SELECT).click().type('users_elastic{downArrow} {enter}');
      inputQuery('where name=1');
      cy.getBySel('resultsTypeField').click();
      cy.contains('Differential (Ignore removals)').click();
      cy.contains('Unique identifier of the us').should('exist');
      cy.contains('User ID').should('exist');

      cy.get(`[aria-labelledby="flyoutTitle"]`).within(() => {
        cy.getBySel('ECSMappingEditorForm')
          .first()
          .within(() => {
            cy.get(`[aria-label="Delete ECS mapping row"]`).first().click();
          });
      });
      cy.contains('Unique identifier of the us').should('not.exist');
      cy.contains('User ID').should('not.exist');
      cy.get(`[aria-labelledby="flyoutTitle"]`).contains('Save').click();

      cy.get(customActionEditSavedQuerySelector('users_elastic')).click();

      cy.contains('SELECT * FROM users;where name=1');
      cy.contains('Unique identifier of the us.').should('not.exist');
      cy.contains('User ID').should('not.exist');
      cy.contains('Differential (Ignore removals)').should('exist');
      cy.get(`[aria-labelledby="flyoutTitle"]`).contains('Cancel').click();
    });
  });
});
