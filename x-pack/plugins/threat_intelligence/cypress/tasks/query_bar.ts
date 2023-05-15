/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QUERY_BAR,
  QUERY_BAR_MENU_REMOVE_ALL_FILTERS_BUTTON,
  QUERY_BAR_MENU,
} from '../screens/query_bar';
import {
  BARCHART_FILTER_IN_BUTTON,
  BARCHART_FILTER_OUT_BUTTON,
  INDICATORS_TABLE_CELL_FILTER_IN_BUTTON,
  INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON,
  INDICATOR_TYPE_CELL,
  FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM,
  FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON,
  FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON,
  FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON,
  FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON,
  FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON,
  FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON,
} from '../screens/indicators';

/**
 * Filter in value by clicking on the menu item within barchart popover
 */
export const filterInFromBarChartLegend = () => {
  cy.get(BARCHART_FILTER_IN_BUTTON).should('exist').click();
};

/**
 * Filter out value by clicking on the menu item within barchart popover
 */
export const filterOutFromBarChartLegend = () => {
  cy.get(BARCHART_FILTER_OUT_BUTTON).should('exist').click();
};

/**
 * Filter in value by clicking on the menu item within an indicators table cell
 */
export const filterInFromTableCell = () => {
  cy.get(INDICATOR_TYPE_CELL)
    .first()
    .should('be.visible')
    .trigger('mouseover')
    .within((_cell) => {
      cy.get(INDICATORS_TABLE_CELL_FILTER_IN_BUTTON).should('exist').click({
        force: true,
      });
    });
};

/**
 * Filter out value by clicking on the menu item within an indicators table cell
 */
export const filterOutFromTableCell = () => {
  cy.get(INDICATOR_TYPE_CELL)
    .first()
    .trigger('mouseover')
    .within((_cell) => {
      cy.get(INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON).should('exist').click({ force: true });
    });
};

/**
 * Clears all filters within KQL bar
 */
export const clearKQLBar = () => {
  cy.get(QUERY_BAR).within(() => cy.get(QUERY_BAR_MENU).click());
  cy.get(QUERY_BAR_MENU_REMOVE_ALL_FILTERS_BUTTON).click();
};

/**
 * Filter in value from indicators flyout block item
 */
export const filterInFromFlyoutBlockItem = () => {
  cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM).first().trigger('mouseover');
  cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON)
    .should('exist')
    .first()
    .click({ force: true });
};

/**
 * Filter out value from indicators flyout block item
 */
export const filterOutFromFlyoutBlockItem = () => {
  cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM).first().trigger('mouseover');
  cy.get(FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON)
    .should('exist')
    .first()
    .click({ force: true });
};

/**
 * Filter in value from indicators flyout overview tab table
 */
export const filterInFromFlyoutOverviewTable = () => {
  cy.get(FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON).should('exist').first().click();
};

/**
 * Filter out value from indicators flyout overview tab table
 */
export const filterOutFromFlyoutOverviewTable = () => {
  cy.get(FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON).should('exist').first().click();
};

/**
 * Filter in value from indicators flyout overview tab table
 */
export const filterInFromFlyoutTableTab = () => {
  cy.get(FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON).should('exist').first().click();
};

/**
 * Filter out value from indicators flyout overview tab table
 */
export const filterOutFromFlyoutTableTab = () => {
  cy.get(FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON).should('exist').first().click();
};
