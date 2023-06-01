/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOSE_TIMELINE_BTN,
  FLYOUT_INVESTIGATE_IN_TIMELINE_ITEM,
  FLYOUT_OVERVIEW_TAB_BLOCKS_TIMELINE_BUTTON,
  FLYOUT_OVERVIEW_TAB_TABLE_ROW_TIMELINE_BUTTON,
  INDICATORS_TABLE_CELL_TIMELINE_BUTTON,
  INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON,
  UNTITLED_TIMELINE_BUTTON,
} from '../screens/timeline';
import {
  BARCHART_TIMELINE_BUTTON,
  FLYOUT_BLOCK_MORE_ACTIONS_BUTTON,
  FLYOUT_TABLE_MORE_ACTIONS_BUTTON,
  INDICATOR_TYPE_CELL,
} from '../screens/indicators';

/**
 * Add data to timeline from barchart legend menu item
 */
export const addToTimelineFromBarchartLegend = () => {
  cy.get(BARCHART_TIMELINE_BUTTON).should('exist').first().click();
};
/**
 * Add data to timeline from indicators table cell menu
 */
export const addToTimelineFromTableCell = () => {
  cy.get(INDICATOR_TYPE_CELL).first().trigger('mouseover');
  cy.get(INDICATORS_TABLE_CELL_TIMELINE_BUTTON).should('exist').first().click({ force: true });
};

/**
 * Open untitled timeline from button in footerx
 */
export const openTimeline = () => {
  cy.get(UNTITLED_TIMELINE_BUTTON).should('exist').first().click({ force: true });
};

/**
 * Close flyout button in top right corner
 */
export const closeTimeline = () => {
  cy.get(CLOSE_TIMELINE_BTN).should('be.visible').click();
};

/**
 * Add data to timeline from flyout overview tab table
 */
export const addToTimelineFromFlyoutOverviewTabTable = () => {
  cy.get(FLYOUT_TABLE_MORE_ACTIONS_BUTTON).first().click({ force: true });
  cy.get(FLYOUT_OVERVIEW_TAB_TABLE_ROW_TIMELINE_BUTTON).should('exist').first().click();
};

/**
 * Add data to timeline from flyout overview tab block
 */
export const addToTimelineFromFlyoutOverviewTabBlock = () => {
  cy.get(FLYOUT_BLOCK_MORE_ACTIONS_BUTTON).first().click({ force: true });
  cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_TIMELINE_BUTTON).should('exist').first().click();
};

/**
 * Investigate data to timeline from indicators table row
 */
export const investigateInTimelineFromTable = () => {
  cy.get(INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON).should('exist').first().click();
};

/**
 * Investigate data to timeline from flyout take action button
 */
export const investigateInTimelineFromFlyout = () => {
  cy.get(FLYOUT_INVESTIGATE_IN_TIMELINE_ITEM).should('exist').first().click();
};
