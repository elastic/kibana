/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../helpers/rules';
import {
  LOAD_PREBUILT_RULES_BTN,
  LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN,
  UPDATE_PREBUILT_RULES_CALLOUT,
} from '../../screens/alerts_detection_rules';
import { waitForRulesTableToBeLoaded } from '../../tasks/alerts_detection_rules';
import { installAvailableRules, createNewRuleAsset } from '../../tasks/api_calls/prebuilt_rules';
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

    // Prevent the installation of the package
    // `security_detection_engine` from Fleet
    cy.intercept('POST', '/api/fleet/epm/packages/_bulk?prerelease=true', {}).as(
      'getPrebuiltRules'
    );
    createNewRuleAsset(
      '.kibana',
      createRuleAssetSavedObject({
        name: 'Test rule 13333',
        rule_id: '000047bb-b27a-47ec-8b62-ef1a5d2c9e19',
        tags: ['test-tag-2'],
      })
    );
  });

  it('should not show any notifications for installation or update of prebuilt rules, if there are none', () => {
    waitForRulesTableToBeLoaded();
    cy.get(LOAD_PREBUILT_RULES_BTN).should('not.exist');
    cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('not.exist');
    cy.get(UPDATE_PREBUILT_RULES_CALLOUT).should('not.exist');
  });

  it('should notify user about prebuilt rules package available for installation', () => {
    waitForRulesTableToBeLoaded();
    cy.get(LOAD_PREBUILT_RULES_BTN, { timeout: 300000 }).should('be.visible');
  });

  describe('Rule installation notification when rules already installed', () => {
    beforeEach(() => {
      installAvailableRules();
      // Create new rule asset with a different rule_id as the one that was
      // installed before in order to trigger the installation process
      createNewRuleAsset(
        '.kibana',
        createRuleAssetSavedObject({
          name: 'Test rule 5555',
          rule_id: '111147bb-b27a-47ec-8b62-ef1a5d342e19',
          tags: ['test-tag-2'],
        })
      );
      waitForRulesTableToBeLoaded();
    });
    it('should notify user about prebuilt rules package available for installation', () => {
      cy.get(LOAD_PREBUILT_RULES_ON_PAGE_HEADER_BTN).should('be.visible');
    });
  });

  describe('Rule update notification', () => {
    beforeEach(() => {
      installAvailableRules();
      // Create new rule asset with the same rule_id as the one that was installed
      // but with a higher version, in order to trigger the update process
      createNewRuleAsset(
        '.kibana',
        createRuleAssetSavedObject({
          name: 'Upgraded - Test rule 13333',
          rule_id: '000047bb-b27a-47ec-8b62-ef1a5d2c9e19',
          tags: ['test-tag-2'],
          version: 2,
        })
      );
      waitForRulesTableToBeLoaded();
    });
    it('should notify user about prebuilt rules package available for installation', () => {
      cy.wait(5000);
      cy.get(UPDATE_PREBUILT_RULES_CALLOUT).should('be.visible');
    });
  });
});
