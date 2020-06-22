/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  goToManageAlertDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/detections';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { exportFirstRule } from '../tasks/alert_detection_rules';

import { ALERTS_URL } from '../urls/navigation';

const EXPECTED_EXPORTED_RULE_FILE_PATH = 'cypress/test_files/expected_rules_export.ndjson';

describe('Export rules', () => {
  before(() => {
    esArchiverLoad('custom_rules');
    cy.server();
    cy.route(
      'POST',
      '**api/detection_engine/rules/_export?exclude_export_details=false&file_name=rules_export.ndjson*'
    ).as('export');
  });

  after(() => {
    esArchiverUnload('custom_rules');
  });

  it('Exports a custom rule', () => {
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertDetectionRules();
    exportFirstRule();
    cy.wait('@export').then((xhr) => {
      cy.readFile(EXPECTED_EXPORTED_RULE_FILE_PATH).then(($expectedExportedJson) => {
        cy.wrap(xhr.responseBody).should('eql', $expectedExportedJson);
      });
    });
  });
});
