/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeDataViews } from '../../tasks/login';
import { OSQUERY_FLYOUT_BODY_EDITOR } from '../../screens/live_query';
import {
  cleanupCase,
  cleanupPack,
  cleanupRule,
  loadCase,
  loadPack,
  loadRule,
  packFixture,
} from '../../tasks/api_fixtures';
import {
  addToCase,
  checkActionItemsInResults,
  loadRuleAlerts,
  submitQuery,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { generateRandomStringName, interceptCaseId } from '../../tasks/integrations';

describe('Alert Event Details - Cases', { tags: ['@ess', '@serverless'] }, () => {
  let ruleId: string;
  let packId: string;
  let packName: string;
  const packData = packFixture();

  beforeEach(() => {
    initializeDataViews();
    loadPack(packData).then((data) => {
      packId = data.saved_object_id;
      packName = data.name;
    });
    loadRule(true).then((data) => {
      ruleId = data.id;
      loadRuleAlerts(data.name);
    });
  });

  afterEach(() => {
    cleanupPack(packId);
    cleanupRule(ruleId);
  });

  describe('Case creation', () => {
    let caseId: string;

    before(() => {
      interceptCaseId((id) => {
        caseId = id;
      });
    });

    after(() => {
      cleanupCase(caseId);
    });

    it('runs osquery against alert and creates a new case', () => {
      const [caseName, caseDescription] = generateRandomStringName(2);
      cy.getBySel('expand-event').first().click();
      cy.getBySel('securitySolutionFlyoutFooterDropdownButton').click();
      cy.getBySel('osquery-action-item').click();
      cy.contains(/^\d+ agen(t|ts) selected/);
      cy.getBySel('globalLoadingIndicator').should('not.exist');
      cy.wait(1000);
      cy.contains('Run a set of queries in a pack').click();
      cy.get(OSQUERY_FLYOUT_BODY_EDITOR).should('not.exist');
      cy.getBySel('globalLoadingIndicator').should('not.exist');
      cy.getBySel('select-live-pack').click().type(`${packName}{downArrow}{enter}`);
      submitQuery();
      cy.get('[aria-label="Add to Case"]').first().click();
      cy.getBySel('cases-table-add-case-filter-bar').click();
      cy.getBySel('create-case-flyout').should('be.visible');
      cy.get('input[aria-describedby="caseTitle"]').type(caseName);
      cy.get('textarea[aria-label="caseDescription"]').type(caseDescription);
      cy.getBySel('create-case-submit').click();
      cy.contains(`An alert was added to "${caseName}"`);
    });
  });

  describe('Case', () => {
    let caseId: string;

    beforeEach(() => {
      loadCase('securitySolution').then((data) => {
        caseId = data.id;
      });
    });

    afterEach(() => {
      cleanupCase(caseId);
    });

    it('sees osquery results from last action and add to a case', () => {
      cy.getBySel('expand-event').first().click();
      cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
      cy.getBySel('securitySolutionFlyoutResponseButton').click();
      cy.getBySel('responseActionsViewWrapper').should('exist');
      cy.contains('select * from users;');
      cy.contains("SELECT * FROM os_version where name='Ubuntu';");
      cy.getBySel('osquery-results-comment').each(($comment) => {
        cy.wrap($comment).within(() => {
          // On initial load result table might not render due to displayed error
          if ($comment.find('div .euiDataGridRow').length <= 0) {
            // If tabs are present try clicking between status and results to get rid of the error message
            if ($comment.find('div .euiTabs').length > 0) {
              cy.getBySel('osquery-status-tab').click();
              cy.getBySel('osquery-results-tab').click();
              cy.getBySel('dataGridRowCell', { timeout: 120000 }).should('have.lengthOf.above', 0);
            }
          } else {
            // Result tab was rendered successfully
            cy.getBySel('dataGridRowCell', { timeout: 120000 }).should('have.lengthOf.above', 0);
          }
        });
      });
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: true,
        timeline: true,
      });

      addToCase(caseId);
      viewRecentCaseAndCheckResults();
    });
  });
});
