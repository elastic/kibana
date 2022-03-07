/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectedExportedRule, getNewRule } from '../../objects/rule';

import { TOASTER } from '../../screens/alerts_detection_rules';

import { exportFirstRule } from '../../tasks/alerts_detection_rules';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Export rules', () => {
  beforeEach(() => {
    cleanKibana();
    cy.intercept(
      'POST',
      '/api/detection_engine/rules/_export?exclude_export_details=false&file_name=rules_export.ndjson'
    ).as('export');
    loginAndWaitForPageWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    createCustomRule(getNewRule()).as('ruleResponse');
  });

  it('Exports a custom rule', function () {
    exportFirstRule();
    cy.wait('@export').then(({ response }) => {
      cy.wrap(response?.body).should('eql', expectedExportedRule(this.ruleResponse));
      cy.get(TOASTER).should(
        'have.text',
        'Successfully exported 1 of 1 rule. Prebuilt rules were excluded from the resulting file.'
      );
    });
  });
});
