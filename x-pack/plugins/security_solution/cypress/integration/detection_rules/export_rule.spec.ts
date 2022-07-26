/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectedExportedRule, getNewRule, totalNumberOfPrebuiltRules } from '../../objects/rule';

import {
  TOASTER_BODY,
  MODAL_CONFIRMATION_BODY,
  MODAL_CONFIRMATION_BTN,
} from '../../screens/alerts_detection_rules';

import {
  exportFirstRule,
  loadPrebuiltDetectionRulesFromHeaderBtn,
  switchToElasticRules,
  selectNumberOfRules,
  bulkExportRules,
  selectAllRules,
} from '../../tasks/alerts_detection_rules';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Export rules', () => {
  before(() => {
    cleanKibana();
    login();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    // Rules get exported via _bulk_action endpoint
    cy.intercept('POST', '/api/detection_engine/rules/_bulk_action').as('bulk_action');
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    createCustomRule(getNewRule()).as('ruleResponse');
  });

  it('Exports a custom rule', function () {
    exportFirstRule();
    cy.wait('@bulk_action').then(({ response }) => {
      cy.wrap(response?.body).should('eql', expectedExportedRule(this.ruleResponse));
      cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
    });
  });

  it('shows a modal saying that no rules can be exported if all the selected rules are prebuilt', function () {
    const expectedElasticRulesCount = 7;

    loadPrebuiltDetectionRulesFromHeaderBtn();

    switchToElasticRules();
    selectNumberOfRules(expectedElasticRulesCount);
    bulkExportRules();

    cy.get(MODAL_CONFIRMATION_BODY).contains(
      `${expectedElasticRulesCount} prebuilt Elastic rules (exporting prebuilt rules is not supported)`
    );
  });

  it('exports only custom rules', function () {
    const expectedNumberCustomRulesToBeExported = 1;
    const totalNumberOfRules = expectedNumberCustomRulesToBeExported + totalNumberOfPrebuiltRules;

    loadPrebuiltDetectionRulesFromHeaderBtn();

    selectAllRules();
    bulkExportRules();

    cy.get(MODAL_CONFIRMATION_BODY).contains(
      `${totalNumberOfPrebuiltRules} prebuilt Elastic rules (exporting prebuilt rules is not supported)`
    );

    // proceed with exporting only custom rules
    cy.get(MODAL_CONFIRMATION_BTN)
      .should('have.text', `Export ${expectedNumberCustomRulesToBeExported} Custom rule`)
      .click();

    cy.get(TOASTER_BODY).should(
      'contain',
      `Successfully exported ${expectedNumberCustomRulesToBeExported} of ${totalNumberOfRules} rules. Prebuilt rules were excluded from the resulting file.`
    );
  });
});
