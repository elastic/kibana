/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_ALERT_COUNT_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_DOC_COUNT_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_HOST_PREVALENCE_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_NAME_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_TYPE_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_USER_PREVALENCE_CELL,
} from '../../../../screens/document_expandable_flyout';
import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP,
} from '../../../../screens/expandable_flyout/alert_details_left_panel';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON } from '../../../../screens/expandable_flyout/alert_details_left_panel_prevalence_tab';
import {
  expandFirstAlertExpandableFlyout,
  openInsightsTab,
  expandDocumentDetailsExpandableFlyoutLeftSection,
  openPrevalence,
} from '../../../../tasks/document_expandable_flyout';
import { cleanKibana } from '../../../../tasks/common';
import { login, visit } from '../../../../tasks/login';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

// Skipping these for now as the feature is protected behind a feature flag set to false by default
// To run the tests locally, add 'securityFlyoutEnabled' in the Cypress config.ts here https://github.com/elastic/kibana/blob/main/x-pack/test/security_solution_cypress/config.ts#L50
describe.skip(
  'Alert details expandable flyout left panel prevalence',
  { env: { ftrConfig: { enableExperimental: ['securityFlyoutEnabled'] } } },
  () => {
    before(() => {
      cleanKibana();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
      expandDocumentDetailsExpandableFlyoutLeftSection();
      openInsightsTab();
      openPrevalence();
    });

    it('should show prevalence table', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
        .should('be.visible')
        .and('have.text', 'Insights');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP).should('be.visible');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON)
        .should('be.visible')
        .and('have.text', 'Prevalence');

      // TODO actual test
    });

    it('should display prevalence table', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_TYPE_CELL)
        .should('have.text', 'host.name')
        .and('have.text', 'user.name');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_NAME_CELL)
        .should('have.text', 'siem-kibana')
        .and('have.text', 'test');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_ALERT_COUNT_CELL).should(
        'have.text',
        2
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_DOC_COUNT_CELL).should(
        'have.text',
        2
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_HOST_PREVALENCE_CELL).should(
        'have.text',
        100
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_USER_PREVALENCE_CELL).should(
        'have.text',
        100
      );
    });
  }
);
