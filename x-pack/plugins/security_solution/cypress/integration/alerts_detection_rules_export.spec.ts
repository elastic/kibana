/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/alerts';
import { exportFirstRule } from '../tasks/alerts_detection_rules';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

const EXPECTED_EXPORTED_RULE_FILE_PATH = 'cypress/test_files/expected_rules_export.ndjson';

describe('Export rules', () => {
  before(() => {
    esArchiverLoad('export_rule');
    cy.server();
    cy.route(
      'POST',
      '**api/detection_engine/rules/_export?exclude_export_details=false&file_name=rules_export.ndjson*'
    ).as('export');
  });

  after(() => {
    esArchiverUnload('export_rule');
  });

  it('Exports a custom rule', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    exportFirstRule();
    cy.wait('@export').then((xhr) => {
      cy.readFile(EXPECTED_EXPORTED_RULE_FILE_PATH).then(($expectedExportedJson) => {
        cy.wrap(xhr.responseBody).should('eql', $expectedExportedJson);
      });
    });
  });
});
