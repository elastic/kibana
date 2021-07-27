/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_NAME } from '../screens/alerts_detection_rules';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/alerts';
import { waitForRulesTableToBeLoaded } from '../tasks/alerts_detection_rules';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { ALERTS_URL } from '../urls/navigation';

describe('After an upgrade, the cusom query rule', () => {
  it('Displays the rule', function () {
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForRulesTableToBeLoaded();
    cy.get(RULE_NAME).should('have.text', 'Custom query rule for upgrade');
  });
});
