/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../../tasks/alerts';
import {
  getRulesImportExportToast,
  importRules,
  importRulesWithOverwriteAll,
} from '../../tasks/alerts_detection_rules';
import { cleanKibana, reload } from '../../tasks/common';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';

describe('Import rules', () => {
  beforeEach(() => {
    cleanKibana();
    cy.intercept('POST', '/api/detection_engine/rules/_import*').as('import');
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
  });

  it('Imports a custom rule with exceptions', function () {
    importRules('7_16_rules.ndjson');

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      getRulesImportExportToast([
        'Successfully imported 1 rule',
        'Successfully imported 2 exceptions.',
      ]);
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
      getRulesImportExportToast(['Failed to import 1 rule', 'Failed to import 2 exceptions']);
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
      getRulesImportExportToast([
        'Successfully imported 1 rule',
        'Successfully imported 2 exceptions.',
      ]);
    });
  });
});
