/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_COLLAPSE_DETAILS_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_EXPAND_DETAILS_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_HISTORY_TAB,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB,
  DOCUMENT_DETAILS_FLYOUT_INVESTIGATIONS_TAB,
  DOCUMENT_DETAILS_FLYOUT_JSON_TAB,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON,
} from '../screens/document_expandable_flyout';
import { EXPAND_ALERT_BTN } from '../screens/alerts';

/**
 * Find the first alert row in the alerts table then click on the expand icon button to open the flyout
 */
export const expandFirstAlertExpandableFlyout = () => {
  cy.get(EXPAND_ALERT_BTN).first().should('be.visible').click();
};

/**
 * Expand the left section of the document details expandable flyout by clicking on the Find the first alert row in the alerts table then click on the expand icon button to open the flyout
 */
export const expandDocumentDetailsExpandableFlyoutLeftSection = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_EXPAND_DETAILS_BUTTON).should('be.visible').click();

/**
 * Expand the left section of the document details expandable flyout by clicking on the Find the first alert row in the alerts table then click on the expand icon button to open the flyout
 */
export const collapseDocumentDetailsExpandableFlyoutLeftSection = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_COLLAPSE_DETAILS_BUTTON).should('be.visible').click();

/**
 * Open the Overview tab in the document details expandable flyout right section
 */
export const openOverviewTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB).should('be.visible').click();

/**
 * Open the Table tab in the document details expandable flyout right section
 */
export const openTableTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB).should('be.visible').click();

/**
 * Open the Json tab in the document details expandable flyout right section
 */
export const openJsonTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB).should('be.visible').click();

/**
 * Open the Visualize tab in the document details expandable flyout left section
 */
export const openVisualizeTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB).should('be.visible').click();

/**
 * Open the Session View under the Visualize tab in the document details expandable flyout left section
 */
export const openSessionView = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON).should('be.visible').click();

/**
 * Open the Graph Analyzer under the Visuablize tab in the document details expandable flyout left section
 */
export const openGraphAnalyzer = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON).should('be.visible').click();

/**
 * Open the Insights tab in the document details expandable flyout left section
 */
export const openInsightsTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB).should('be.visible').click();

/**
 * Open the Investigations tab in the document details expandable flyout left section
 */
export const openInvestigationsTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_INVESTIGATIONS_TAB).should('be.visible').click();

/**
 * Open the History tab in the document details expandable flyout left section
 */
export const openHistoryTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_HISTORY_TAB).should('be.visible').click();
