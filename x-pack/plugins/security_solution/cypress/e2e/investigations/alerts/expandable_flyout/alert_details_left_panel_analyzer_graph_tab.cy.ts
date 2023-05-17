/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYZER_NODE } from '../../../../screens/alerts';
import { DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_CONTENT } from '../../../../screens/document_expandable_flyout';
import {
  expandFirstAlertExpandableFlyout,
  openGraphAnalyzer,
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
  'Alert details expandable flyout left panel analyzer graph',
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
      openGraphAnalyzer();
    });

    it('should display analyzer graph and node list', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_CONTENT).should('be.visible');
      cy.get(ANALYZER_NODE).first().should('be.visible');
    });
  }
);
