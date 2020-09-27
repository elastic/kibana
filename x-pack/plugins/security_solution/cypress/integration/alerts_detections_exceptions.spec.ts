/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { goToManageAlertsDetectionRules, waitForAlertsPanelToBeLoaded } from '../tasks/alerts';
import { goToRuleDetails } from '../tasks/alerts_detection_rules';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { DETECTIONS_URL } from '../urls/navigation';

describe('Exceptions', () => {
  before(() => {
    esArchiverLoad('rule');
  });

  after(() => {
    esArchiverUnload('rule');
  });

  it('Creates an exception from rule details', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    goToManageAlertsDetectionRules();
    goToRuleDetails();

    cy.pause();
  });
  /* it('Creates an exception from an existing alert');
    it('Deletes an existing exception');*/
});
