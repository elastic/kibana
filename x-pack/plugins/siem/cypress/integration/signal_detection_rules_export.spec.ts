/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  goToManageSignalDetectionRules,
  waitForSignalsIndexToBeCreated,
  waitForSignalsPanelToBeLoaded,
} from '../tasks/detections';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { exportFirstRule } from '../tasks/signal_detection_rules';

import { DETECTIONS } from '../urls/navigation';

const EXPECTED_RULE_FILE_PATH = '../../../../../downloads/rules_export.ndjson';
const EXPECTED_EXPORTED_RULE_FILE_PATH = 'cypress/test_files/expected_rules_export.ndjson';

describe('Export rules', () => {
  before(() => {
    esArchiverLoad('custom_rules');
  });

  after(() => {
    esArchiverUnload('custom_rules');
  });

  it('Exports a custom rule', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS);
    waitForSignalsPanelToBeLoaded();
    waitForSignalsIndexToBeCreated();
    goToManageSignalDetectionRules();
    exportFirstRule();

    cy.readFile(EXPECTED_RULE_FILE_PATH).then($exportedJson => {
      cy.readFile(EXPECTED_EXPORTED_RULE_FILE_PATH).then($expectedExportedJson => {
        cy.wrap($exportedJson).should('eql', $expectedExportedJson);
      });
    });
  });
});
