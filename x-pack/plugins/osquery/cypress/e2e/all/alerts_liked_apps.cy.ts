/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import { RESPONSE_ACTIONS_ITEM_0, RESPONSE_ACTIONS_ITEM_1 } from '../../tasks/response_actions';
import {
  checkActionItemsInResults,
  inputQuery,
  loadRuleAlerts,
  submitQuery,
} from '../../tasks/live_query';
import { closeModalIfVisible, closeToastIfVisible } from '../../tasks/integrations';
import { RESULTS_TABLE, RESULTS_TABLE_BUTTON } from '../../screens/live_query';
import { tag } from '../../tags';
import { ServerlessRoleName } from '../../support/roles';

const UUID_REGEX = '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}';

describe('Alert Event Details', { browser: 'electron', tags: [tag.ESS, tag.SERVERLESS] }, () => {
  let ruleId: string;
  let ruleName: string;

  before(() => {
    loadRule().then((data) => {
      ruleId = data.id;
      ruleName = data.name;
      loadRuleAlerts(data.name);
    });
  });

  after(() => {
    cleanupRule(ruleId);
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    cy.visit('/app/security/rules');
    cy.contains(ruleName).click();
  });

  it('should be able to add investigation guides to response actions', () => {
    const investigationGuideNote =
      'You have queries in the investigation guide. Add them as response actions?';
    cy.getBySel('editRuleSettingsLink').click();
    cy.getBySel('globalLoadingIndicator').should('not.exist');
    cy.getBySel('edit-rule-actions-tab').click();

    cy.contains(investigationGuideNote);
    cy.getBySel('osqueryAddInvestigationGuideQueries').click();
    cy.contains(investigationGuideNote).should('not.exist');

    cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
      cy.contains("SELECT * FROM os_version where name='{{host.os.name}}';");
      cy.contains('host.os.platform');
      cy.contains('platform');
    });
    cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
      cy.contains('select * from users');
    });
    cy.contains('Save changes').click();
    cy.contains(`${ruleName} was saved`).should('exist');
    closeToastIfVisible();
  });

  it('should be able to run live query and add to timeline', () => {
    const TIMELINE_NAME = 'Untitled timeline';
    cy.getBySel('timeline-context-menu-button').first().click();
    cy.contains('Run Osquery');
    cy.getBySel('expand-event').first().click();
    cy.getBySel('take-action-dropdown-btn').click();
    cy.getBySel('osquery-action-item').click();
    cy.contains('1 agent selected.');
    inputQuery('select * from uptime;');
    submitQuery();
    cy.contains('Results');
    cy.contains('Add to timeline investigation');
    cy.contains('Save for later').click();
    cy.contains('Save query');
    cy.get('[data-test-subj="osquery-save-query-flyout"]').within(() => {
      cy.get('.euiButtonEmpty').contains('Cancel').click();
    });
    cy.getBySel('add-to-timeline').first().click();
    cy.getBySel('globalToastList').contains('Added');
    closeToastIfVisible();
    cy.getBySel(RESULTS_TABLE).within(() => {
      cy.getBySel(RESULTS_TABLE_BUTTON).should('not.exist');
    });
    cy.contains('Cancel').click();
    cy.getBySel('flyoutBottomBar').within(() => {
      cy.contains(TIMELINE_NAME).click();
    });
    cy.getBySel('draggableWrapperKeyboardHandler').contains('action_id: "');
    // timeline unsaved changes modal
    cy.visit('/app/osquery');
    closeModalIfVisible();
  });

  it('can visit discover from response action results', { tags: [tag.ESS] }, () => {
    const discoverRegex = new RegExp(`action_id: ${UUID_REGEX}`);
    cy.getBySel('expand-event').first().click();
    cy.getBySel('securitySolutionDocumentDetailsFlyoutResponseSectionHeader').click();
    cy.getBySel('securitySolutionDocumentDetailsFlyoutResponseButton').click();
    cy.getBySel('responseActionsViewWrapper').should('exist');
    checkActionItemsInResults({
      lens: true,
      discover: true,
      cases: true,
      timeline: true,
    });
    cy.contains('View in Discover')
      .should('exist')
      .should('have.attr', 'href')
      .then(($href) => {
        // @ts-expect-error-next-line href string - check types
        cy.visit($href);
        cy.getBySel('breadcrumbs').contains('Discover').should('exist');
        cy.getBySel('discoverDocTable', { timeout: 60000 }).within(() => {
          cy.contains(`action_data.query`);
        });
        cy.contains(discoverRegex);
      });
  });

  it('can visit lens from response action results', { tags: [tag.ESS] }, () => {
    const lensRegex = new RegExp(`Action ${UUID_REGEX} results`);
    cy.getBySel('expand-event').first().click();
    cy.getBySel('securitySolutionDocumentDetailsFlyoutResponseSectionHeader').click();
    cy.getBySel('securitySolutionDocumentDetailsFlyoutResponseButton').click();
    cy.getBySel('responseActionsViewWrapper').should('exist');
    checkActionItemsInResults({
      lens: true,
      discover: true,
      cases: true,
      timeline: true,
    });
    cy.getBySel('osquery-results-comment')
      .first()
      .within(() => {
        let lensUrl = '';
        cy.window().then((win) => {
          cy.stub(win, 'open')
            .as('windowOpen')
            .callsFake((url) => {
              lensUrl = url;
            });
        });
        cy.get(`[aria-label="View in Lens"]`).click();
        cy.window()
          .its('open')
          .then(() => {
            cy.visit(lensUrl);
          });
      });
    cy.getBySel('lnsWorkspace').should('exist');
    cy.getBySel('breadcrumbs').contains(lensRegex);
  });

  it('can add to timeline from response action results', { tags: [tag.ESS] }, () => {
    const timelineRegex = new RegExp(`Added ${UUID_REGEX} to timeline`);
    const filterRegex = new RegExp(`action_id: "${UUID_REGEX}"`);
    cy.getBySel('expand-event').first().click();
    cy.getBySel('securitySolutionDocumentDetailsFlyoutResponseSectionHeader').click();
    cy.getBySel('securitySolutionDocumentDetailsFlyoutResponseButton').click();
    cy.getBySel('responseActionsViewWrapper').should('exist');
    checkActionItemsInResults({
      lens: true,
      discover: true,
      cases: true,
      timeline: true,
    });
    cy.getBySel('osquery-results-comment')
      .first()
      .within(() => {
        cy.get('.euiTableRow')
          .first()
          .within(() => {
            cy.getBySel('add-to-timeline').click();
          });
      });
    cy.contains(timelineRegex);
    cy.getBySel('securitySolutionDocumentDetailsFlyoutHeaderCollapseDetailButton').click();
    cy.getBySel('flyoutBottomBar').contains('Untitled timeline').click();
    cy.contains(filterRegex);
  });
});
