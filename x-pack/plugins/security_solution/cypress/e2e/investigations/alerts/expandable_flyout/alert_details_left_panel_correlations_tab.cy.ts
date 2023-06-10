/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON } from '../../../../screens/expandable_flyout/alert_details_left_panel_correlations_tab';
import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP,
} from '../../../../screens/expandable_flyout/alert_details_left_panel';
import { openCorrelationsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel_correlations_tab';
import { openInsightsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { cleanKibana } from '../../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { login, visit } from '../../../../tasks/login';
import { ALERTS_URL } from '../../../../urls/navigation';

describe(
  'Expandable flyout left panel correlations',
  { env: { ftrConfig: { enableExperimental: ['securityFlyoutEnabled'] } } },
  () => {
    beforeEach(() => {
      cleanKibana();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
      expandDocumentDetailsExpandableFlyoutLeftSection();
      openInsightsTab();
      openCorrelationsTab();
    });

    it('should serialize its state to url', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
        .should('be.visible')
        .and('have.text', 'Insights');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP).should('be.visible');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON)
        .should('be.visible')
        .and('have.text', 'Correlations');

      // TODO actual test
    });
  }
);
