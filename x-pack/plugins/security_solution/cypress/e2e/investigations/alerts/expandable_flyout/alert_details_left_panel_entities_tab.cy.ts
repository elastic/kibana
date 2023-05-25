/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS,
} from '../../../../screens/document_expandable_flyout';
import {
  expandFirstAlertExpandableFlyout,
  openInsightsTab,
  openEntities,
  expandDocumentDetailsExpandableFlyoutLeftSection,
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
  'Alert details expandable flyout left panel entities',
  { testIsolation: false },
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
      openEntities();
    });

    it('should display analyzer graph and node list', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS)
        .scrollIntoView()
        .should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS)
        .scrollIntoView()
        .should('be.visible');
    });
  }
);
