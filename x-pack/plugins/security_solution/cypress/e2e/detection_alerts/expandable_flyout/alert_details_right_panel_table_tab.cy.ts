/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeTimeline, openActiveTimeline } from '../../../tasks/timeline';
import { PROVIDER_BADGE } from '../../../screens/timeline';
import { removeKqlFilter } from '../../../tasks/search_bar';
import { FILTER_BADGE } from '../../../screens/alerts';
import {
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ID_ROW,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_COPY_TO_CLIPBOARD,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_ROW,
} from '../../../screens/document_expandable_flyout';
import {
  addToTimelineTableTabTable,
  clearFilterTableTabTable,
  copyToClipboardTableTabTable,
  expandFirstAlertExpandableFlyout,
  filterInTableTabTable,
  filterOutTableTabTable,
  filterTableTabTable,
  openTableTab,
} from '../../../tasks/document_expandable_flyout';
import { cleanKibana } from '../../../tasks/common';
import { login, visit } from '../../../tasks/login';
import { createRule } from '../../../tasks/api_calls/rules';
import { getNewRule } from '../../../objects/rule';
import { ALERTS_URL } from '../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';

// Skipping these for now as the feature is protected behind a feature flag set to false by default
// To run the tests locally, add 'securityFlyoutEnabled' in the Cypress config.ts here https://github.com/elastic/kibana/blob/main/x-pack/test/security_solution_cypress/config.ts#L50
describe.skip('Alert details expandable flyout right panel', { testIsolation: false }, () => {
  before(() => {
    cleanKibana();
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
    expandFirstAlertExpandableFlyout();
    openTableTab();
  });

  it('should display and filter the table', () => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_ROW).should('be.visible');
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ID_ROW).should('be.visible');
    filterTableTabTable('timestamp');
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_ROW).should('be.visible');
    clearFilterTableTabTable();
  });

  it('should test filter in cell actions', () => {
    filterInTableTabTable();
    cy.get(FILTER_BADGE).first().should('contain.text', '@timestamp:');
    removeKqlFilter();
  });

  it('should test filter out cell actions', () => {
    filterOutTableTabTable();
    cy.get(FILTER_BADGE).first().should('contain.text', 'NOT @timestamp:');
    removeKqlFilter();
  });

  it('should test add to timeline cell actions', () => {
    addToTimelineTableTabTable();
    openActiveTimeline();
    cy.get(PROVIDER_BADGE).first().should('contain.text', '@timestamp');
    closeTimeline();
  });

  it('should test copy to clipboard cell actions', () => {
    copyToClipboardTableTabTable();
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_COPY_TO_CLIPBOARD).should('be.visible');
  });
});
