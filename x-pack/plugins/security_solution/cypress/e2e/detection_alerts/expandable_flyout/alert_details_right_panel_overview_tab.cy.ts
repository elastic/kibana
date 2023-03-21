/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_GO_TO_TABLE_LINK,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_EVENT_TYPE_ROW,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_EXPAND_ICON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_TITLE,
} from '../../../screens/document_expandable_flyout';
import {
  expandFirstAlertExpandableFlyout,
  openOverviewTab,
} from '../../../tasks/document_expandable_flyout';
import { cleanKibana } from '../../../tasks/common';
import { login, visit } from '../../../tasks/login';
import { createRule } from '../../../tasks/api_calls/rules';
import { getNewRule } from '../../../objects/rule';
import { ALERTS_URL } from '../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';

// Skipping these for now as the feature is protected behind a feature flag set to false by default
// To run the tests locally, add 'securityFlyoutEnabled' in the Cypress config.ts here https://github.com/elastic/kibana/blob/main/x-pack/test/security_solution_cypress/config.ts#L50
describe.skip(
  'Alert details expandable flyout right panel overview tab',
  { testIsolation: false },
  () => {
    before(() => {
      cleanKibana();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
      openOverviewTab();
    });

    it('should display mitre attack', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_TITLE).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_DETAILS).should('be.visible');
    });

    it('should display highlighted fields', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS).within(() => {
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_EXPAND_ICON)
          .should('be.visible')
          .click();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_TITLE)
          .should('be.visible')
          .and('have.text', 'Highlighted fields');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_DETAILS).should(
          'be.visible'
        );

        // close highlighted fields to reset the view for next test
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_EXPAND_ICON)
          .should('be.visible')
          .click();
      });
    });

    it('should navigate to table tab when clicking on highlighted fields view button', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS).within(() => {
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_EXPAND_ICON)
          .should('be.visible')
          .click();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_GO_TO_TABLE_LINK)
          .should('be.visible')
          .click();
      });

      // the table component is rendered within a dom element with overflow, so Cypress isn't finding it
      // this next line is a hack that scrolls to a specific element in the table
      // (in the middle of it vertically) to ensure Cypress finds it
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_EVENT_TYPE_ROW).scrollIntoView();
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CONTENT).should('be.visible');
    });
  }
);
