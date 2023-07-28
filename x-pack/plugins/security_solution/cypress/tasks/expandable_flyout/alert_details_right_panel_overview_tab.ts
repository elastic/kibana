/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_VIEW_ALL_ENTITIES_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VIEW_ALL_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_VIEW_ALL_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_VIEW_ALL_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_RULE_PREVIEW_BUTTON,
} from '../../screens/expandable_flyout/alert_details_right_panel_overview_tab';

/* About section */

/**
 * Toggle the Overview tab about section in the document details expandable flyout right section
 */
export const toggleOverviewTabAboutSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER).should('be.visible').click();
};

/* Investigation section */

/**
 * Toggle the Overview tab investigation section in the document details expandable flyout right section
 */
export const toggleOverviewTabInvestigationSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER)
    .should('be.visible')
    .click();
};

/* Insights section */

/**
 * Toggle the Overview tab insights section in the document details expandable flyout right section
 */
export const toggleOverviewTabInsightsSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_HEADER).should('be.visible').click();
};

/**
 * Click on the view all button under the right section, Insights, Entities
 */
export const clickEntitiesViewAllButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_VIEW_ALL_ENTITIES_BUTTON).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_VIEW_ALL_ENTITIES_BUTTON)
    .should('be.visible')
    .click();
};

/**
 * Click on the view all button under the right section, Insights, Threat Intelligence
 */
export const clickThreatIntelligenceViewAllButton = () => {
  cy.get(
    DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_VIEW_ALL_BUTTON
  ).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_VIEW_ALL_BUTTON)
    .should('be.visible')
    .click();
};

/**
 * Click on the view all button under the right section, Insights, Correlations
 */
export const clickCorrelationsViewAllButton = () => {
  cy.get(
    DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VIEW_ALL_BUTTON
  ).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_VIEW_ALL_BUTTON)
    .should('be.visible')
    .click();
};

/**
 * Click on the view all button under the right section, Insights, Prevalence
 */
export const clickPrevalenceViewAllButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_VIEW_ALL_BUTTON).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_VIEW_ALL_BUTTON)
    .should('be.visible')
    .click();
};

/* Visualizations section */

/**
 * Toggle the Overview tab visualizations section in the document details expandable flyout right section
 */
export const toggleOverviewTabVisualizationsSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_HEADER)
    .should('be.visible')
    .click();
};

/**
 * Click on the investigation guide button under the right section, Visualization
 */
export const clickInvestigationGuideButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON)
    .should('be.visible')
    .click();
};

/**
 * Click `Rule summary` button to open rule preview panel
 */
export const clickRuleSummaryButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE)
    .should('be.visible')
    .within(() => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_RULE_PREVIEW_BUTTON)
        .should('be.visible')
        .click();
    });
};
