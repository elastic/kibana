/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DETAILS_FLYOUT_JSON_TAB,
  ALERT_DETAILS_FLYOUT_OVERVIEW_TAB,
  ALERT_DETAILS_FLYOUT_TABLE_TAB,
} from '../screens/alert_details_expandable_flyout';
import { EXPAND_ALERT_BTN } from '../screens/alerts';

/**
 * Find the first alert row in the alerts table then click on the expand icon button to open the flyout
 */
export const expandFirstAlertExpandableFlyout = () => {
  cy.get(EXPAND_ALERT_BTN).first().click();
};

/**
 * Open the Overview tab in the alert details expandable flyout right section
 */
export const openOverviewTab = () =>
  cy.get(ALERT_DETAILS_FLYOUT_OVERVIEW_TAB).should('be.visible').click();

/**
 * Open the Table tab in the alert details expandable flyout right section
 */
export const openTableTab = () =>
  cy.get(ALERT_DETAILS_FLYOUT_TABLE_TAB).should('be.visible').click();

/**
 * Open the Json tab in the alert details expandable flyout right section
 */
export const openJsonTab = () => cy.get(ALERT_DETAILS_FLYOUT_JSON_TAB).should('be.visible').click();
