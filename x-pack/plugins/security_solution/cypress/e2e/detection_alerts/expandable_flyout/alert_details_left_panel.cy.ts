/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_HISTORY_TAB,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_INVESTIGATIONS_TAB_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_INVESTIGATIONS_TAB,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_BUTTON_GROUP,
  DOCUMENT_DETAILS_FLYOUT_HISTORY_TAB_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_CONTENT,
} from '../../../screens/document_expandable_flyout';
import {
  expandDocumentDetailsExpandableFlyoutLeftSection,
  expandFirstAlertExpandableFlyout,
  openGraphAnalyzer,
  openHistoryTab,
  openInsightsTab,
  openInvestigationsTab,
  openSessionView,
  openVisualizeTab,
  openEntities,
  openThreatIntelligence,
  openPrevalence,
  openCorrelations,
} from '../../../tasks/document_expandable_flyout';
import { cleanKibana } from '../../../tasks/common';
import { login, visit } from '../../../tasks/login';
import { createRule } from '../../../tasks/api_calls/rules';
import { getNewRule } from '../../../objects/rule';
import { ALERTS_URL } from '../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';

// Skipping these for now as the feature is protected behind a feature flag set to false by default
// To run the tests locally, add 'securityFlyoutEnabled' in the Cypress config.ts here https://github.com/elastic/kibana/blob/main/x-pack/test/security_solution_cypress/config.ts#L50
describe.skip('Alert details expandable flyout left panel', { testIsolation: false }, () => {
  before(() => {
    cleanKibana();
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
    expandFirstAlertExpandableFlyout();
    expandDocumentDetailsExpandableFlyoutLeftSection();
  });

  it('should display 4 tabs in the header', () => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB)
      .should('be.visible')
      .and('have.text', 'Visualize');
    cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB).should('be.visible').and('have.text', 'Insights');
    cy.get(DOCUMENT_DETAILS_FLYOUT_INVESTIGATIONS_TAB)
      .should('be.visible')
      .and('have.text', 'Investigation');
    cy.get(DOCUMENT_DETAILS_FLYOUT_HISTORY_TAB).should('be.visible').and('have.text', 'History');
  });

  it('should display tab content when switching tabs', () => {
    openVisualizeTab();
    cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_BUTTON_GROUP).should('be.visible');

    openInsightsTab();
    cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP).should('be.visible');

    openInvestigationsTab();
    cy.get(DOCUMENT_DETAILS_FLYOUT_INVESTIGATIONS_TAB_CONTENT).should('be.visible');

    openHistoryTab();
    cy.get(DOCUMENT_DETAILS_FLYOUT_HISTORY_TAB_CONTENT).should('be.visible');
  });

  describe('visualiza tab', () => {
    it('should display a button group with 2 button in the visualize tab', () => {
      openVisualizeTab();
      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON)
        .should('be.visible')
        .and('have.text', 'Session View');
      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON)
        .should('be.visible')
        .and('have.text', 'Analyzer Graph');
    });

    it('should display content when switching buttons', () => {
      openVisualizeTab();
      openSessionView();
      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_CONTENT).should('be.visible');

      openGraphAnalyzer();
      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_CONTENT).should('be.visible');
    });
  });

  describe('insights tab', () => {
    it('should display a button group with 4 button in the insights tab', () => {
      openInsightsTab();
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON)
        .should('be.visible')
        .and('have.text', 'Entities');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON)
        .should('be.visible')
        .and('have.text', 'Threat Intelligence');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON)
        .should('be.visible')
        .and('have.text', 'Prevalence');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON)
        .should('be.visible')
        .and('have.text', 'Correlations');
    });

    it('should display content when switching buttons', () => {
      openInsightsTab();
      openEntities();
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_CONTENT)
        .should('be.visible')
        .and('have.text', 'Entities');

      openThreatIntelligence();
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_CONTENT)
        .should('be.visible')
        .and('have.text', 'Threat Intelligence');

      openPrevalence();
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_CONTENT)
        .should('be.visible')
        .and('have.text', 'Prevalence');

      openCorrelations();
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_CONTENT)
        .should('be.visible')
        .and('have.text', 'Correlations');
    });
  });
});
