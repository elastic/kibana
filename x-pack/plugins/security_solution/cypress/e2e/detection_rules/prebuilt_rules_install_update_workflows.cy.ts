/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForRulesTableToBeLoaded } from '../../tasks/alerts_detection_rules';
import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../tasks/common';
import { esArchiverResetKibana } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';

interface PackageItem {
  name: string;
  result: {
    installSource: string;
  };
}

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

    waitForRulesTableToBeLoaded();
  });

  it('should install package from Fleet', () => {
    // TODO: Should not request prerelease
    cy.intercept('POST', '/api/fleet/epm/packages/_bulk?prerelease=true').as('installPackage');

    cy.wait('@installPackage').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);

      const packages = response?.body.items.map(({ name, result }: PackageItem) => ({
        name,
        installSource: result.installSource,
      }));

      expect(packages.length).to.have.greaterThan(0);
      expect(packages).to.deep.include.members([
        { name: 'security_detection_engine', installSource: 'registry' },
      ]);
    });
  });
});
