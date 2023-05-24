/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_BODY,
  DOCUMENT_DETAILS_FLYOUT_COLLAPSE_DETAILS_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_EXPAND_DETAILS_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_FOOTER,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_HISTORY_TAB,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB,
  DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB,
  DOCUMENT_DETAILS_FLYOUT_JSON_TAB,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CLEAR_FILTER,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_FILTER,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ADD_TO_TIMELINE,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_IN,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_OUT,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_MORE_ACTIONS,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON_DROPDOWN,
  KIBANA_NAVBAR_ALERTS_PAGE,
  KIBANA_NAVBAR_CASES_PAGE,
} from '../screens/document_expandable_flyout';
import { EXPAND_ALERT_BTN } from '../screens/alerts';
import { getClassSelector } from '../helpers/common';

/**
 * Navigates to the alerts page by clicking on the Kibana sidenav entry
 */
export const navigateToAlertsPage = () => {
  cy.get(KIBANA_NAVBAR_ALERTS_PAGE).should('be.visible').click();
};

/**
 * Navigates to the cases page by clicking on the Kibana sidenav entry
 */
export const navigateToCasesPage = () => {
  cy.get(KIBANA_NAVBAR_CASES_PAGE).should('be.visible').click();
};

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
 * Scroll to x-y positions within the right section of the document details expandable flyout
 * // TODO revisit this as it seems very fragile: the first element found is the timeline flyout, which isn't visible but still exist in the DOM
 */
export const scrollWithinDocumentDetailsExpandableFlyoutRightSection = (x: number, y: number) =>
  cy.get(getClassSelector('euiFlyout')).last().scrollTo(x, y);

/**
 * Scroll down to the flyout footer's take action button, open its dropdown and click on the desired option
 */
export const openTakeActionButtonAndSelectItem = (option: string) => {
  openTakeActionButton();
  selectTakeActionItem(option);
};

/**
 * Scroll down to the flyout footer's take action button and open its dropdown
 */
export const openTakeActionButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER)
    .scrollIntoView()
    .within(() => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible').click();
    });
};

/**
 * Click on the item within the flyout's footer take action button dropdown
 */
export const selectTakeActionItem = (option: string) => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON_DROPDOWN)
    .should('be.visible')
    .within(() => cy.get(option).should('be.visible').click());
};

/**
 * Open the Overview tab in the document details expandable flyout right section
 */
export const openOverviewTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB).scrollIntoView().should('be.visible').click();

/**
 * Toggle the Overview tab investigation section in the document details expandable flyout right section
 */
export const toggleOverviewTabInvestigationSection = () =>
  cy
    .get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER)
    .scrollIntoView()
    .should('be.visible')
    .click();

/**
 * Toggle the Overview tab description section in the document details expandable flyout right section
 */
export const toggleOverviewTabDescriptionSection = () =>
  cy
    .get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_SECTION_HEADER)
    .scrollIntoView()
    .should('be.visible')
    .click();

/**
 * Toggle the Overview tab insights section in the document details expandable flyout right section
 */
export const toggleOverviewTabInsightsSection = () =>
  cy
    .get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_HEADER)
    .scrollIntoView()
    .should('be.visible')
    .click();

/**
 * Toggle the Overview tab visualizations section in the document details expandable flyout right section
 */
export const toggleOverviewTabVisualizationsSection = () =>
  cy
    .get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_HEADER)
    .scrollIntoView()
    .should('be.visible')
    .click();

/**
 * Open the Table tab in the document details expandable flyout right section
 */
export const openTableTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB).scrollIntoView().should('be.visible').click();

/**
 * Open the Json tab in the document details expandable flyout right section
 */
export const openJsonTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB).scrollIntoView().should('be.visible').click();

/**
 * Open the Visualize tab in the document details expandable flyout left section
 */
export const openVisualizeTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB).scrollIntoView().should('be.visible').click();

/**
 * Open the Session View under the Visualize tab in the document details expandable flyout left section
 */
export const openSessionView = () =>
  cy
    .get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON)
    .scrollIntoView()
    .should('be.visible')
    .click();

/**
 * Open the Graph Analyzer under the Visuablize tab in the document details expandable flyout left section
 */
export const openGraphAnalyzer = () =>
  cy
    .get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON)
    .scrollIntoView()
    .should('be.visible')
    .click();

/**
 * Open the Insights tab in the document details expandable flyout left section
 */
export const openInsightsTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB).scrollIntoView().should('be.visible').click();

/**
 * Open the Entities tab under the Insights tab in the document details expandable flyout left section
 */
export const openEntities = () =>
  cy
    .get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON)
    .scrollIntoView()
    .should('be.visible')
    .click();
/**
 * Open the Threat intelligence tab under the Insights tab in the document details expandable flyout left section
 */
export const openThreatIntelligence = () =>
  cy
    .get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON)
    .scrollIntoView()
    .should('be.visible')
    .click();

/**
 * Open the Prevalence tab under the Visuablize tab in the document details expandable flyout left section
 */
export const openPrevalence = () =>
  cy
    .get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON)
    .scrollIntoView()
    .should('be.visible')
    .click();

/**
 * Open the Correlations tab  under the Visuablize tab in the document details expandable flyout left section
 */
export const openCorrelations = () =>
  cy
    .get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON)
    .scrollIntoView()
    .should('be.visible')
    .click();
/**
 * Open the Investigations tab in the document details expandable flyout left section
 */
export const openInvestigationTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB).scrollIntoView().should('be.visible').click();

/**
 * Open the History tab in the document details expandable flyout left section
 */
export const openHistoryTab = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_HISTORY_TAB).scrollIntoView().should('be.visible').click();

/**
 * Filter table under the Table tab in the alert details expandable flyout right section
 */
export const filterTableTabTable = (filterValue: string) =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_FILTER).type(filterValue);
  });

/**
 * Clear table filter under the Table tab in the alert details expandable flyout right section
 */
export const clearFilterTableTabTable = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CLEAR_FILTER).click();
  });

/**
 * Filter In action in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const filterInTableTabTable = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_IN).first().click();
  });

/**
 * Filter Out action in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const filterOutTableTabTable = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_OUT).first().click();
  });

/**
 * Add to timeline action in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const addToTimelineTableTabTable = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_MORE_ACTIONS).first().click();
  });
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ADD_TO_TIMELINE).click();
};

/**
 * Show Copy to clipboard button in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const copyToClipboardTableTabTable = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_MORE_ACTIONS).first().click();
  });
};

/**
 * Clear filters in the alert page KQL bar
 */
export const clearFilters = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_OUT).first().click();
  });
