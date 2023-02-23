/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_MANAGEMENT_TABLE, TOASTER } from '../../screens/alerts_detection_rules';
import {
  expectNumberOfRules,
  expectToContainRule,
  importRules,
  importRulesWithOverwriteAll,
} from '../../tasks/alerts_detection_rules';
import { cleanKibana, deleteAlertsAndRules, reload } from '../../tasks/common';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Import rules', () => {
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    deleteAlertsAndRules();
    cy.intercept('POST', '/api/detection_engine/rules/_import*').as('import');
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
  });

  it('Imports a custom rule with exceptions', function () {
    const expectedNumberOfRules = 1;
    const expectedImportedRuleName = 'Test Custom Rule';

    importRules('7_16_rules.ndjson');

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should(
        'have.text',
        'Successfully imported 1 ruleSuccessfully imported 1 exception.'
      );

      expectNumberOfRules(RULES_MANAGEMENT_TABLE, expectedNumberOfRules);
      expectToContainRule(RULES_MANAGEMENT_TABLE, expectedImportedRuleName);
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
        'Successfully imported 1 ruleSuccessfully imported 1 exception.'
      );
    });
  });
});
