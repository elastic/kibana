/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeDataViews } from '../../tasks/login';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import { checkActionItemsInResults, loadRuleAlerts } from '../../tasks/live_query';

const UUID_REGEX = '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}';

describe('Alert Flyout Automated Action Results', () => {
  let ruleId: string;

  before(() => {
    initializeDataViews();
  });

  beforeEach(() => {
    loadRule(true).then((data) => {
      ruleId = data.id;
      loadRuleAlerts(data.name);
    });
  });

  afterEach(() => {
    cleanupRule(ruleId);
  });

  it('can visit discover from response action results', { tags: ['@ess'] }, () => {
    const discoverRegex = new RegExp(`action_id: ${UUID_REGEX}`);
    cy.getBySel('expand-event').first().click();
    cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
    cy.getBySel('securitySolutionFlyoutResponseButton').click();
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
        cy.getBySel('discoverDocTable', { timeout: 60000 }).within(() => {
          cy.contains('action_data{ "query":');
        });
        cy.contains(discoverRegex);
      });
  });

  it('can visit lens from response action results', { tags: ['@ess'] }, () => {
    const lensRegex = new RegExp(`Action ${UUID_REGEX} results`);
    cy.getBySel('expand-event').first().click();
    cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
    cy.getBySel('securitySolutionFlyoutResponseButton').click();
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

  it('can add to timeline from response action results', { tags: ['@ess', '@serverless'] }, () => {
    const timelineRegex = new RegExp(`Added ${UUID_REGEX} to timeline`);
    const filterRegex = new RegExp(`action_id: "${UUID_REGEX}"`);
    cy.getBySel('expand-event').first().click();
    cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
    cy.getBySel('securitySolutionFlyoutResponseButton').click();
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
    cy.getBySel('securitySolutionFlyoutNavigationCollapseDetailButton').click();
    cy.getBySel('timeline-bottom-bar').contains('Untitled timeline').click();
    cy.contains(filterRegex);
  });
});
