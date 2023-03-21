/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_COLLAPSE_DETAILS_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_EXPAND_DETAILS_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE,
  DOCUMENT_DETAILS_FLYOUT_JSON_TAB,
  DOCUMENT_DETAILS_FLYOUT_JSON_TAB_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_EVENT_TYPE_ROW,
} from '../../../screens/document_expandable_flyout';
import {
  collapseDocumentDetailsExpandableFlyoutLeftSection,
  expandDocumentDetailsExpandableFlyoutLeftSection,
  expandFirstAlertExpandableFlyout,
  openJsonTab,
  openOverviewTab,
  openTableTab,
  scrollWithinDocumentDetailsExpandableFlyoutRightSection,
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
  });

  it('should display title in the header', () => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE).should('be.visible').and('have.text', 'Title');
  });

  it('should toggle expand detail button in the header', () => {
    expandDocumentDetailsExpandableFlyoutLeftSection();
    cy.get(DOCUMENT_DETAILS_FLYOUT_COLLAPSE_DETAILS_BUTTON)
      .should('be.visible')
      .and('have.text', 'Collapse alert details');

    collapseDocumentDetailsExpandableFlyoutLeftSection();
    cy.get(DOCUMENT_DETAILS_FLYOUT_EXPAND_DETAILS_BUTTON)
      .should('be.visible')
      .and('have.text', 'Expand alert details');
  });

  it('should display 3 tabs in the right section', () => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB).should('be.visible').and('have.text', 'Overview');
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB).should('be.visible').and('have.text', 'Table');
    cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB).should('be.visible').and('have.text', 'JSON');
  });

  it('should display tab content when switching tabs in the right section', () => {
    openOverviewTab();
    // we shouldn't need to test anything here as it's covered with the new overview_tab file

    openTableTab();
    // the table component is rendered within a dom element with overflow, so Cypress isn't finding it
    // this next line is a hack that scrolls to a specific element in the table to ensure Cypress finds it
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_EVENT_TYPE_ROW).scrollIntoView();
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CONTENT).should('be.visible');

    // scroll back up to the top to open the json tab
    cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB).scrollIntoView();

    openJsonTab();
    // the json component is rendered within a dom element with overflow, so Cypress isn't finding it
    // this next line is a hack that vertically scrolls down to ensure Cypress finds it
    scrollWithinDocumentDetailsExpandableFlyoutRightSection(0, 6500);
    cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB_CONTENT).should('be.visible');
  });
});
