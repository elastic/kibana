/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_ACTION_WRAPPER,
  CASE_ELLIPSE_BUTTON,
  CASE_ELLIPSE_DELETE_CASE_CONFIRMATION_BUTTON,
  CASE_ELLIPSE_DELETE_CASE_OPTION,
  CREATE_CASE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_FOOTER,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_ENDPOINT_EXCEPTION,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_MARK_AS_ACKNOWLEDGED,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_CANCEL_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_HEADER,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_EXISTING_CASE,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_CREATE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_DESCRIPTION_INPUT,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_NAME_INPUT,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_ENTRY,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_SECTION,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_MARK_AS_CLOSED,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_RESPOND,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON,
  EXISTING_CASE_SELECT_BUTTON,
  KIBANA_TOAST,
  NEW_CASE_CREATE_BUTTON,
  NEW_CASE_DESCRIPTION_INPUT,
  NEW_CASE_NAME_INPUT,
  VIEW_CASE_TOASTER_LINK,
} from '../../../screens/document_expandable_flyout';
import {
  expandFirstAlertExpandableFlyout,
  navigateToAlertsPage,
  navigateToCasesPage,
  openJsonTab,
  openOverviewTab,
  openTableTab,
  openTakeActionButton,
  openTakeActionButtonAndSelectItem,
} from '../../../tasks/document_expandable_flyout';
import { cleanKibana } from '../../../tasks/common';
import { login, visit } from '../../../tasks/login';
import { createRule } from '../../../tasks/api_calls/rules';
import { getNewRule } from '../../../objects/rule';
import { ALERTS_URL } from '../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';

const createNewCaseFromCases = () => {
  navigateToCasesPage();
  cy.get(CREATE_CASE_BUTTON).should('be.visible').click();
  cy.get(NEW_CASE_NAME_INPUT).should('be.visible').click().type('case');
  cy.get(NEW_CASE_DESCRIPTION_INPUT).should('be.visible').click().type('case description');
  cy.get(NEW_CASE_CREATE_BUTTON).should('be.visible').click();
};

const deleteCase = () => {
  cy.get(CASE_ACTION_WRAPPER).find(CASE_ELLIPSE_BUTTON).should('be.visible').click();
  cy.get(CASE_ELLIPSE_DELETE_CASE_OPTION).should('be.visible').click();
  cy.get(CASE_ELLIPSE_DELETE_CASE_CONFIRMATION_BUTTON).should('be.visible').click();
};

// Skipping these for now as the feature is protected behind a feature flag set to false by default
// To run the tests locally, add 'securityFlyoutEnabled' in the Cypress config.ts here https://github.com/elastic/kibana/blob/main/x-pack/test/security_solution_cypress/config.ts#L50
describe.skip(
  'Alert details expandable flyout right panel footer',
  { testIsolation: false },
  () => {
    before(() => {
      cleanKibana();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
    });

    it('should display footer take action button on all tabs', () => {
      openOverviewTab();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).scrollIntoView().should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible');

      openTableTab();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).scrollIntoView().should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible');

      openJsonTab();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).scrollIntoView().should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible');

      // reset state for next test
      openOverviewTab();
    });

    // TODO this will change when add to existing case is improved
    //  https://github.com/elastic/security-team/issues/6298
    it('should add to existing case', () => {
      createNewCaseFromCases();

      navigateToAlertsPage();
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
      openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_EXISTING_CASE);

      cy.get(EXISTING_CASE_SELECT_BUTTON).should('be.visible').contains('Select').click();
      cy.get(VIEW_CASE_TOASTER_LINK).click();
      deleteCase();

      // navigate back to alert page and reopen flyout for next test
      navigateToAlertsPage();
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
    });

    // TODO this will change when add to new case is improved
    //  https://github.com/elastic/security-team/issues/6298
    it('should add to new case', () => {
      openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE);

      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_NAME_INPUT).type('case');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_DESCRIPTION_INPUT).type(
        'case description'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_CREATE_BUTTON).click();

      cy.get(VIEW_CASE_TOASTER_LINK).click();
      deleteCase();

      // navigate back to alert page and reopen flyout for next test
      navigateToAlertsPage();
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
    });

    // TODO figure out how to properly test the result and recreate the alert for the next tests
    it.skip('should mark as acknowledged', () => {
      openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_MARK_AS_ACKNOWLEDGED);
      cy.get(KIBANA_TOAST)
        // .should('be.visible')
        .and('have.text', 'Successfully marked 1 alert as acknowledged.');
    });

    // TODO figure out how to properly test the result and recreate the alert for the next tests
    it.skip('should mark as closed', () => {
      openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_MARK_AS_CLOSED);
      cy.get(KIBANA_TOAST).should('be.visible').and('have.text', 'Successfully closed 1 alert.');
    });

    // TODO figure out why this option is disabled in Cypress but not running the app locally
    //  https://github.com/elastic/security-team/issues/6300
    it('should add endpoint exception', () => {
      openTakeActionButton();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_ENDPOINT_EXCEPTION).should('be.disabled');
    });

    // TODO this isn't fully testing the add rule exception yet
    //  https://github.com/elastic/security-team/issues/6301
    it('should add rule exception', () => {
      openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION);
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_HEADER).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_CANCEL_BUTTON)
        .should('be.visible')
        .click();
    });

    // TODO figure out why isolate host isn't showing up in the dropdown
    //  https://github.com/elastic/security-team/issues/6302
    it.skip('should isolate host', () => {});

    // TODO this will change when respond is improved
    //  https://github.com/elastic/security-team/issues/6303
    it('should respond', () => {
      openTakeActionButton();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_RESPOND).should('be.disabled');
    });

    it('should investigate in timeline', () => {
      openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE);
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_SECTION)
        .first()
        .within(() =>
          cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_ENTRY).should('be.visible')
        );
    });
  }
);
