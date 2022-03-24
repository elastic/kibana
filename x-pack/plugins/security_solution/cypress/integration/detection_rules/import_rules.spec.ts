/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOASTER } from '../../screens/alerts_detection_rules';
import { importRules, importRulesWithOverwriteAll } from '../../tasks/alerts_detection_rules';
import { cleanKibana, reload } from '../../tasks/common';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Import rules', () => {
  beforeEach(() => {
    cleanKibana();
    cy.intercept('POST', '/api/detection_engine/rules/_import*').as('import');
    loginAndWaitForPageWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
  });

  it('Imports a custom rule with exceptions', function () {
    importRules('7_16_rules.ndjson');

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should(
        'have.text',
        'Successfully imported 1 ruleSuccessfully imported 2 exceptions.'
      );
    });
  });

  it('Shows error toaster when trying to import rule and exception list that already exist', function () {
    importRules('7_16_rules.ndjson');

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
    });

    reload();
    importRules('7_16_rules.ndjson');

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should('have.text', 'Failed to import 1 ruleFailed to import 2 exceptions');
    });
  });

  it('Does not show error toaster when trying to import rule and exception list that already exist when overwrite is true', function () {
    importRules('7_16_rules.ndjson');

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
    });

    reload();
    importRulesWithOverwriteAll('7_16_rules.ndjson');

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should(
        'have.text',
        'Successfully imported 1 ruleSuccessfully imported 2 exceptions.'
      );
    });
  });
});
