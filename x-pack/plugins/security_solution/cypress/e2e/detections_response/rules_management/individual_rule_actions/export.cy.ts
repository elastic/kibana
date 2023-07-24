/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { expectedExportedRule, getNewRule } from '../../../../objects/rule';
import { TOASTER_BODY, TOASTER } from '../../../../screens/alerts_detection_rules';
import {
  waitForRuleExecution,
  exportRule,
  importRules,
  expectManagementTableRules,
} from '../../../../tasks/alerts_detection_rules';
import { createRule } from '../../../../tasks/api_calls/rules';
import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../../urls/navigation';
import { preventPrebuiltRulesPackageInstallation } from '../../../../tasks/api_calls/prebuilt_rules';

const EXPORTED_RULES_FILENAME = 'rules_export.ndjson';

describe('Export rules', () => {
  const downloadsFolder = Cypress.config('downloadsFolder');

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
    deleteAlertsAndRules();
    // Rules get exported via _bulk_action endpoint
    cy.intercept('POST', '/api/detection_engine/rules/_bulk_action').as('bulk_action');
    // Prevent installation of whole prebuilt rules package, use mock prebuilt rules instead
    preventPrebuiltRulesPackageInstallation();
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    createRule(getNewRule({ name: 'Rule to export' })).as('ruleResponse');
  });

  it('exports a custom rule', function () {
    exportRule('Rule to export');
    cy.wait('@bulk_action').then(({ response }) => {
      cy.wrap(response?.body).should('eql', expectedExportedRule(this.ruleResponse));
      cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
    });
  });

  it('creates an importable file from executed rule', () => {
    // Rule needs to be enabled to make sure it has been executed so rule's SO contains runtime fields like `execution_summary`
    createRule(getNewRule({ name: 'Enabled rule to export', enabled: true }));
    waitForRuleExecution('Enabled rule to export');

    exportRule('Enabled rule to export');

    cy.get(TOASTER).should('have.text', 'Rules exported');
    cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');

    deleteAlertsAndRules();
    importRules(path.join(downloadsFolder, EXPORTED_RULES_FILENAME));

    cy.get(TOASTER).should('have.text', 'Successfully imported 1 rule');
    expectManagementTableRules(['Enabled rule to export']);
  });
});
