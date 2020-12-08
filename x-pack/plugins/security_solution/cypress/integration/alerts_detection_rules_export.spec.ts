/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { expectedExportedRule, newRule } from '../objects/rule';
import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/alerts';
import { exportFirstRule } from '../tasks/alerts_detection_rules';
import { createCustomRule, deleteCustomRule } from '../tasks/api_calls/rules';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Export rules', () => {
  let rule = '';
  before(async () => {
    cy.server();
    cy.route(
      'POST',
      '**api/detection_engine/rules/_export?exclude_export_details=false&file_name=rules_export.ndjson*'
    ).as('export');
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    rule = await createCustomRule(newRule);
  });

  after(() => {
    deleteCustomRule();
  });

  it('Exports a custom rule', () => {
    goToManageAlertsDetectionRules();
    exportFirstRule();
    const jsonRule = JSON.parse(JSON.stringify(rule));
    cy.wait('@export').then((xhr) => {
      cy.wrap(xhr.responseBody).should('eql', expectedExportedRule(jsonRule));
    });
  });
});
