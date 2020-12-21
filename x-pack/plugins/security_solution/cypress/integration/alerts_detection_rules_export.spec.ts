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
import { createCustomRule, removeSignalsIndex } from '../tasks/api_calls/rules';
import { cleanKibana } from '../tasks/common';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe.skip('Export rules', () => {
  let ruleResponse: Cypress.Response;
  before(() => {
    cleanKibana();
    removeSignalsIndex();
    cy.intercept(
      'POST',
      '/api/detection_engine/rules/_export?exclude_export_details=false&file_name=rules_export.ndjson'
    ).as('export');
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRule(newRule).then((response) => {
      ruleResponse = response;
    });
  });

  it('Exports a custom rule', () => {
    goToManageAlertsDetectionRules();
    exportFirstRule();
    cy.wait('@export').then(({ response }) => {
      cy.wrap(response!.body).should('eql', expectedExportedRule(ruleResponse));
    });
  });
});
