/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeDataViews } from '../../tasks/login';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import {
  inputQuery,
  loadRuleAlerts,
  submitQuery,
  takeOsqueryActionWithParams,
} from '../../tasks/live_query';
import { OSQUERY_FLYOUT_BODY_EDITOR } from '../../screens/live_query';

describe(
  'Alert Event Details - dynamic params',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      initializeDataViews();
      loadRule(true).then((data) => {
        ruleId = data.id;
        ruleName = data.name;
      });
    });

    after(() => {
      cleanupRule(ruleId);
    });

    beforeEach(() => {
      loadRuleAlerts(ruleName);
    });

    it('should substitute parameters in investigation guide', () => {
      cy.getBySel('expand-event').first().click();
      cy.getBySel('securitySolutionFlyoutInvestigationGuideButton').click();
      // Flakes at times if the button is only clicked once
      cy.contains('Get processes').should('be.visible').dblclick({ force: true });
      // Cypress can properly reads the fields when the codeEditor is interacted with first
      // This is probably due to the tokenization of the fields when it's inactive
      cy.get(OSQUERY_FLYOUT_BODY_EDITOR).click();
      cy.getBySel('flyout-body-osquery').contains("SELECT * FROM os_version where name='Ubuntu';");
      cy.getBySel('flyout-body-osquery').find('input[value="host.os.platform"]').should('exist');
      cy.getBySel('flyout-body-osquery').contains('platform');
    });

    // response-actions-notification doesn't exist in expandable flyout
    it.skip('should substitute parameters in live query and increase number of ran queries', () => {
      let initialNotificationCount: number;
      let updatedNotificationCount: number;
      cy.getBySel('expand-event').first().click();
      cy.getBySel('response-actions-notification')
        .should('not.have.text', '0')
        .then((element) => {
          initialNotificationCount = parseInt(element.text(), 10);
        });
      takeOsqueryActionWithParams();
      cy.getBySel('osquery-empty-button').click();
      cy.getBySel('response-actions-notification')
        .should('not.have.text', '0')
        .then((element) => {
          updatedNotificationCount = parseInt(element.text(), 10);
          expect(initialNotificationCount).to.be.equal(updatedNotificationCount - 1);
        })
        .then(() => {
          cy.getBySel('securitySolutionDocumentDetailsFlyoutResponseSectionHeader').click();
          cy.getBySel('securitySolutionDocumentDetailsFlyoutResponseButton').click();
          cy.getBySel('responseActionsViewWrapper').within(() => {
            cy.contains('tags');
            cy.getBySel('osquery-results-comment').should('have.length', updatedNotificationCount);
          });
        });

      it('should be able to run take action query against all enrolled agents', () => {
        cy.getBySel('expand-event').first().click();
        cy.getBySel('take-action-dropdown-btn').click();
        cy.getBySel('osquery-action-item').click();
        cy.getBySel('agentSelection').within(() => {
          cy.getBySel('comboBoxClearButton').click();
          cy.getBySel('comboBoxInput').type('All{downArrow}{enter}{esc}');
          cy.contains('All agents');
        });
        inputQuery("SELECT * FROM os_version where name='{{host.os.name}}';", {
          parseSpecialCharSequences: false,
        });
        cy.wait(1000);
        submitQuery();
        cy.getBySel('flyout-body-osquery').within(() => {
          // at least 2 agents should have responded, sometimes it takes a while for the agents to respond
          cy.get('[data-grid-row-index]', { timeout: 6000000 }).should('have.length.at.least', 2);
        });
      });

      it('should substitute params in osquery ran from timelines alerts', () => {
        cy.getBySel('send-alert-to-timeline-button').first().click();
        cy.getBySel('query-events-table').within(() => {
          cy.getBySel('expand-event').first().click();
        });
        takeOsqueryActionWithParams();
      });
    });
  }
);
