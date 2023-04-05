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
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_SECTION_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_EXPAND_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_DETAILS,
} from '../../../screens/document_expandable_flyout';
import {
  expandFirstAlertExpandableFlyout,
  openOverviewTab,
  toggleOverviewTabDescriptionSection,
  toggleOverviewTabInvestigationSection,
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
    const rule = getNewRule();

    before(() => {
      cleanKibana();
      login();
      createRule(rule);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
      openOverviewTab();
    });

    describe('description section', () => {
      it('should display description section header and content', () => {
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_SECTION_HEADER)
          .should('be.visible')
          .and('have.text', 'Description');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_SECTION_CONTENT).should(
          'be.visible'
        );
      });

      it('should display document description and expand button', () => {
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE)
          .should('be.visible')
          .and('have.text', 'Rule description');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_DETAILS)
          .should('be.visible')
          .and('have.text', rule.description);
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_EXPAND_BUTTON)
          .should('be.visible')
          .and('have.text', 'Expand');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_EXPAND_BUTTON).click();
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_EXPAND_BUTTON).should(
          'have.text',
          'Collapse'
        );
      });

      it('should display reason', () => {
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE)
          .should('be.visible')
          .and('have.text', 'Alert reason');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_DETAILS)
          .should('be.visible')
          .and('contain.text', rule.name);
      });

      it('should display mitre attack', () => {
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_TITLE)
          .should('be.visible')
          // @ts-ignore
          .and('contain.text', rule.threat[0].framework);

        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_MITRE_ATTACK_DETAILS)
          .should('be.visible')
          // @ts-ignore
          .and('contain.text', rule.threat[0].technique[0].name)
          // @ts-ignore
          .and('contain.text', rule.threat[0].tactic.name);
      });
    });

    describe('investigation section', () => {
      before(() => {
        toggleOverviewTabDescriptionSection();
        toggleOverviewTabInvestigationSection();
      });

      it('should display description section header and content', () => {
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER)
          .should('be.visible')
          .and('have.text', 'Investigation');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_CONTENT).should(
          'be.visible'
        );
      });

      it('should display highlighted fields', () => {
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_HEADER_TITLE)
          .should('be.visible')
          .and('have.text', 'Highlighted fields');
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_DETAILS).should(
          'be.visible'
        );
      });

      it('should navigate to table tab when clicking on highlighted fields view button', () => {
        cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_HIGHLIGHTED_FIELDS_GO_TO_TABLE_LINK)
          .should('be.visible')
          .click();

        // the table component is rendered within a dom element with overflow, so Cypress isn't finding it
        // this next line is a hack that scrolls to a specific element in the table
        // (in the middle of it vertically) to ensure Cypress finds it
        cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_EVENT_TYPE_ROW).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CONTENT).should('be.visible');

        // go back to Overview tab to reset view for next test
        openOverviewTab();
      });
    });
  }
);
