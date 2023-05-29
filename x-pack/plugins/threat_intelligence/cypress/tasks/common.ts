/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MANAGE_NAVIGATION_ITEMS,
  SECURITY_SOLUTION_NAVBAR_CASES_ITEM,
  SECURITY_SOLUTION_NAVBAR_MANAGE_ITEM,
  SECURITY_SOLUTION_NAVBAR_THREAT_INTELLIGENCE_ITEM,
  UPDATE_STATUS,
} from '../screens/common';

import {
  BARCHART_POPOVER_BUTTON,
  FLYOUT_CLOSE_BUTTON,
  FLYOUT_TABS,
  FLYOUT_TAKE_ACTION_BUTTON,
  INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON,
  TOGGLE_FLYOUT_BUTTON,
} from '../screens/indicators';

/**
 * Navigate to Blocklist screen via the Security Solution navbar and Manage menu item
 */
export const navigateToBlocklist = () => {
  cy.get(SECURITY_SOLUTION_NAVBAR_MANAGE_ITEM).scrollIntoView().click();
  cy.get(MANAGE_NAVIGATION_ITEMS).contains('Blocklist').click();
};

/**
 * Navigate to Threat Intelligence screen via the Security Solution navbar
 */
export const navigateToThreatIntelligence = () => {
  cy.get(SECURITY_SOLUTION_NAVBAR_THREAT_INTELLIGENCE_ITEM).click();
};

/**
 * Navigate to Cases screen via the Security Solution navbar
 */
export const navigateToCases = () => {
  cy.get(SECURITY_SOLUTION_NAVBAR_CASES_ITEM).click();
};

/**
 * Close the opened flyout
 */
export const closeFlyout = () => {
  cy.get(FLYOUT_CLOSE_BUTTON).click();
};

/**
 * Open the indicators table more actions menu
 */
export const openIndicatorsTableMoreActions = (index: number) => {
  cy.get(INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON).eq(index).click();
};

/**
 * Open the indicator flyout from indicators table
 */
export const openFlyout = (index: number) => {
  cy.get(TOGGLE_FLYOUT_BUTTON).eq(index).click({ force: true });
};

/**
 * Open the take action button within indicator flyout
 */
export const openFlyoutTakeAction = () => {
  cy.get(FLYOUT_TAKE_ACTION_BUTTON).first().click();
};

/**
 * Navigate to Table tab in indicators flyout
 */
export const navigateToFlyoutTableTab = () => {
  cy.get(`${FLYOUT_TABS} button:nth-child(2)`).click();
};

/**
 * Navigate to Json tab in indicators flyout
 */
export const navigateToFlyoutJsonTab = () => {
  cy.get(`${FLYOUT_TABS} button:nth-child(3)`).click();
};

export const waitForViewToBeUpdated = () => {
  cy.get(UPDATE_STATUS).scrollIntoView().should('contain.text', 'Updated');
};

/**
 * Open barchart 3-dot popover menu
 */
export const openBarchartPopoverMenu = () => {
  cy.get(BARCHART_POPOVER_BUTTON).should('exist').first().click();
};
