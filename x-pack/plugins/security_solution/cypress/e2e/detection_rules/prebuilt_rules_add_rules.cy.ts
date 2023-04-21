/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../helpers/rules';
import { waitForRulesTableToBeLoaded } from '../../tasks/alerts_detection_rules';
import { createNewRuleAsset } from '../../tasks/api_calls/prebuilt_rules';
import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../tasks/common';
import { esArchiverResetKibana } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';

describe('Detection rules, Prebuilt Rules Installation and Update workflow', () => {
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
    deleteAlertsAndRules();
    esArchiverResetKibana();

    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    createNewRuleAsset(
      '.kibana',
      createRuleAssetSavedObject({
        name: 'Test rule 13333',
        rule_id: '000047bb-b27a-47ec-8b62-ef1a5d2c9e19',
        tags: ['test-tag-2'],
      })
    );
    waitForRulesTableToBeLoaded();
  });

  it('should install package from Fleet', () => {
    // TODO: Should not request prerelease
    cy.wait(20000);
  });
});
