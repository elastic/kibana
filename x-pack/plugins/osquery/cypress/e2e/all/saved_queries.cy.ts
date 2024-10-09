/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeToastIfVisible, generateRandomStringName } from '../../tasks/integrations';
import {
  LIVE_QUERY_EDITOR,
  RESULTS_TABLE_BUTTON,
  RESULTS_TABLE_COLUMNS_BUTTON,
} from '../../screens/live_query';
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
  BIG_QUERY,
  checkResults,
  deleteAndConfirm,
  fillInQueryTimeout,
  inputQuery,
  selectAllAgents,
  submitQuery,
  verifyQueryTimeout,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { navigateTo } from '../../tasks/navigation';
import {
  loadCase,
  cleanupCase,
  loadPack,
  cleanupPack,
  loadSavedQuery,
  cleanupSavedQuery,
} from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';
import { getAdvancedButton } from '../../screens/integrations';

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

  it(
    'should create a new query and verify: \n ' +
      '- hidden columns, full screen and sorting \n' +
      '- pagination \n' +
      '- query can viewed (status), edited and deleted ',
    () => {
      const timeout = '601';
      const suffix = generateRandomStringName(1)[0];
      const savedQueryId = `Saved-Query-Id-${suffix}`;
      const savedQueryDescription = `Test saved query description ${suffix}`;
      cy.contains('New live query').click();
      selectAllAgents();
      inputQuery(BIG_QUERY);
      getAdvancedButton().click();
      fillInQueryTimeout(timeout);
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
      cy.getBySel(RESULTS_TABLE_COLUMNS_BUTTON).should('have.text', 'Columns35');
      cy.getBySel('dataGridColumnSelectorButton').click();
      cy.get('[data-popover-open="true"]').should('be.visible');
      cy.getBySel('dataGridColumnSelectorToggleColumnVisibility-osquery.cmdline').click();
      cy.getBySel('dataGridColumnSelectorToggleColumnVisibility-osquery.cwd').click();
      cy.getBySel(
        'dataGridColumnSelectorToggleColumnVisibility-osquery.disk_bytes_written.number'
      ).click();
      cy.getBySel('dataGridColumnSelectorButton').click();
      cy.get('[data-popover-open="true"]').should('not.exist');
      cy.getBySel(RESULTS_TABLE_COLUMNS_BUTTON).should('have.text', 'Columns32/35');

      // change pagination
      cy.getBySel('pagination-button-next').click();
      cy.getBySel('globalLoadingIndicator').should('not.exist');
      cy.getBySel('pagination-button-next').click();
      cy.getBySel(RESULTS_TABLE_COLUMNS_BUTTON).should('have.text', 'Columns32/35');

      // enter fullscreen
      cy.getBySel(RESULTS_TABLE_BUTTON).trigger('mouseover');
      cy.contains(/Enter fullscreen$/).should('not.exist');
      cy.contains('Exit fullscreen').should('exist');
      cy.getBySel(RESULTS_TABLE_BUTTON).click();

      // sorting
      cy.getBySel('dataGridHeaderCellActionButton-osquery.egid').click({ force: true });
      cy.contains(/Sort A-Z$/).click();
      cy.getBySel(RESULTS_TABLE_COLUMNS_BUTTON).should('have.text', 'Columns32/35');
      cy.getBySel(RESULTS_TABLE_BUTTON).trigger('mouseover');
      cy.contains(/Enter fullscreen$/).should('exist');

      // visit Status results
      cy.getBySel('osquery-status-tab').click();
      cy.get('tbody > tr.euiTableRow').should('have.lengthOf', 2);

      // save new query
      cy.contains('Exit full screen').should('not.exist');
      cy.contains('Save for later').click();
      cy.contains('Save query');
      cy.get('input[name="id"]').type(`${savedQueryId}{downArrow}{enter}`);
      cy.get('input[name="description"]').type(`${savedQueryDescription}{downArrow}{enter}`);
      cy.getBySel('savedQueryFlyoutSaveButton').click();
      cy.contains('Successfully saved');
      closeToastIfVisible();

      // play saved query
      navigateTo('/app/osquery/saved_queries');
      cy.contains(savedQueryId);
      cy.get(`[aria-label="Run ${savedQueryId}"]`).click();
      selectAllAgents();
      verifyQueryTimeout(timeout);
      submitQuery();

      // edit saved query
      cy.contains('Saved queries').click();
      cy.contains(savedQueryId);

      cy.get(`[aria-label="Edit ${savedQueryId}"]`).click();
      cy.get('input[name="description"]').type(` Edited{downArrow}{enter}`);

      // Run in test configuration
      cy.contains('Test configuration').click();
      selectAllAgents();
      verifyQueryTimeout(timeout);
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
      cy.getBySel('update-query-button').click();
      cy.contains(`${savedQueryDescription} Edited`);

      // delete saved query
      cy.contains(savedQueryId);
      cy.get(`[aria-label="Edit ${savedQueryId}"]`).click();

      deleteAndConfirm('query');
      cy.contains(savedQueryId).should('exist');
      cy.contains(savedQueryId).should('not.exist');
    }
  );

  // Failing: See https://github.com/elastic/kibana/issues/187388
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
