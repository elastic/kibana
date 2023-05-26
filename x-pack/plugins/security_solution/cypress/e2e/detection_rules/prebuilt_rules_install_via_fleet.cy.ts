/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_RULES_BTN,
  LOAD_PREBUILT_RULES_BTN,
  TOASTER,
} from '../../screens/alerts_detection_rules';
import { waitForRulesTableToBeLoaded } from '../../tasks/alerts_detection_rules';
import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../tasks/common';
import { esArchiverResetKibana } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';

interface Asset {
  id: string;
  type: string;
}
interface PackageItem {
  name: string;
  result: {
    installSource: string;
    assets: Asset[];
  };
}

describe('Detection rules, Prebuilt Rules Installation and Update workflow', () => {
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    resetRulesTableState();
    deleteAlertsAndRules();
    esArchiverResetKibana();

    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
  });

  describe('Installation of prebuilt rules package via Fleet', () => {
    beforeEach(() => {
      waitForRulesTableToBeLoaded();
    });

    it('should install package from Fleet in the background', () => {
      cy.intercept('POST', '/api/fleet/epm/packages/_bulk*').as('installPackage');

      /* Assert that the package in installed from Fleet by checking that
      /* the installSource is "registry", as opposed to "bundle" */
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

    it('should install rules from the Fleet package when user clicks on CTA', () => {
      cy.intercept('POST', '/api/fleet/epm/packages/_bulk*').as('installPackage');

      /* Retrieve how many rules were installed from the Fleet package */
      cy.wait('@installPackage').then(({ response }) => {
        const packageAssets = response?.body.items.find(
          ({ name }: PackageItem) => name === 'security_detection_engine'
        ).result.assets;

        const rulesWithHistoricalVersions = packageAssets.filter(
          ({ type }: Asset) => type === 'security-rule'
        );

        // Get unique rules to install by removing version appendix
        // from rule id and then removing duplicates
        const numberOfRulesToInstall = [
          ...new Set(rulesWithHistoricalVersions.map(({ id }: Asset) => id.split('_')[0])),
        ].length;

        cy.get(LOAD_PREBUILT_RULES_BTN).click();
        cy.get(LOAD_PREBUILT_RULES_BTN).should('have.attr', 'disabled');
        cy.get(LOAD_PREBUILT_RULES_BTN).should('not.exist');
        cy.get(TOASTER).should('be.visible').contains('Installed pre-packaged rules');

        cy.get(ELASTIC_RULES_BTN).contains(numberOfRulesToInstall);
      });
    });
  });
});
