/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

import { FIELD } from '../../screens/alerts_details';
import { INTEGRATIONS, INTEGRATIONS_STATUS } from '../../screens/rule_details';
import {
  INTEGRATIONS_POPOVER,
  INTEGRATIONS_POPOVER_TITLE,
  RULE_NAME,
} from '../../screens/alerts_detection_rules';

import { cleanFleet } from '../../tasks/api_calls/fleet';
import { importRule } from '../../tasks/api_calls/rules';
import {
  disableRelatedIntegrations,
  enableRelatedIntegrations,
} from '../../tasks/api_calls/kibana_advanced_settings';

import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { expandFirstAlert } from '../../tasks/alerts';
import { filterBy, openTable } from '../../tasks/alerts_details';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { installAwsCloudFrontWithPolicy } from '../../tasks/integrations';
import {
  enableRule,
  goToTheRuleDetailsOf,
  openIntegrationsPopover,
  waitForRulesTableToShow,
  waitForRuleToUpdate,
} from '../../tasks/alerts_detection_rules';

/*
Note that the rule we are using for testing purposes has the following characteristics, changing that may affect the coverage.

- Single-integration
  - Package: system
- Multi-integration package
  - Package: aws
  - Integration: cloudtrail
  - Integration: cloudfront
- Not existing package:
  - Package: unknown
- Not existing integration & existing package:
  - Package: aws
  - Integration: unknown
*/

describe('Related integrations', () => {
  before(() => {
    login();
    cleanKibana();
    importRule('related_integrations.ndjson');
  });

  context('integrations not installed', () => {
    const rule = {
      name: 'Related integrations rule',
      integrations: ['Aws Cloudfront', 'Aws Cloudtrail', 'Aws Unknown', 'System'],
      enabledIntegrations: '0',
    };

    before(() => {
      cleanFleet();
    });

    beforeEach(() => {
      visit(DETECTIONS_RULE_MANAGEMENT_URL);
      waitForRulesTableToShow();
    });

    it('should display a badge with the installed integrations on the rule management page', () => {
      cy.get(INTEGRATIONS_POPOVER).should(
        'have.text',
        `${rule.enabledIntegrations}/${rule.integrations.length} integrations`
      );
    });

    it('should display a popover when clicking the badge with the installed integrations on the rule management page', () => {
      openIntegrationsPopover();

      cy.get(INTEGRATIONS_POPOVER_TITLE).should(
        'have.text',
        `[${rule.integrations.length}] Related integrations available`
      );
      cy.get(INTEGRATIONS).should('have.length', rule.integrations.length);
      cy.get(INTEGRATIONS_STATUS).should('have.length', rule.integrations.length);

      rule.integrations.forEach((integration, index) => {
        cy.get(INTEGRATIONS).eq(index).should('contain', integration);
        cy.get(INTEGRATIONS_STATUS).eq(index).should('have.text', 'Not installed');
      });
    });

    it('should display the integrations on the definition section', () => {
      goToTheRuleDetailsOf(rule.name);

      cy.get(INTEGRATIONS).should('have.length', rule.integrations.length);
      cy.get(INTEGRATIONS_STATUS).should('have.length', rule.integrations.length);

      rule.integrations.forEach((integration, index) => {
        cy.get(INTEGRATIONS).eq(index).should('contain', integration);
        cy.get(INTEGRATIONS_STATUS).eq(index).should('have.text', 'Not installed');
      });
    });
  });

  context(
    'installed integrations: Amazon CloudFront, AWS CloudTrail, System, enabled integrations: Amazon CloudFront, Aws Cloudfront, System',
    () => {
      const rule = {
        name: 'Related integrations rule',
        integrations: [
          { name: 'Amazon CloudFront', installed: true, enabled: true },
          { name: 'AWS CloudTrail', installed: true, enabled: false },
          { name: 'Aws Unknown', installed: false, enabled: false },
          { name: 'System', installed: true, enabled: true },
        ],
        enabledIntegrations: '2',
      };

      before(() => {
        cleanFleet().then(() => {
          installAwsCloudFrontWithPolicy();
        });
      });

      beforeEach(() => {
        visit(DETECTIONS_RULE_MANAGEMENT_URL);
        waitForRulesTableToShow();
      });

      it('should display a badge with the installed integrations on the rule management page', () => {
        cy.get(INTEGRATIONS_POPOVER).should(
          'have.text',
          `${rule.enabledIntegrations}/${rule.integrations.length} integrations`
        );
      });

      it('should display a popover when clicking the badge with the installed integrations on the rule management page', () => {
        openIntegrationsPopover();

        cy.get(INTEGRATIONS_POPOVER_TITLE).should(
          'have.text',
          `[${rule.integrations.length}] Related integrations available`
        );
        cy.get(INTEGRATIONS).should('have.length', rule.integrations.length);
        cy.get(INTEGRATIONS_STATUS).should('have.length', rule.integrations.length);

        rule.integrations.forEach((integration, index) => {
          let expectedStatus = integration.installed ? 'Installed' : 'Not installed';
          if (integration.enabled) expectedStatus += ': enabled';

          cy.get(INTEGRATIONS).eq(index).should('contain', integration.name);
          cy.get(INTEGRATIONS_STATUS).eq(index).should('have.text', expectedStatus);
        });
      });

      it('should display the integrations on the definition section', () => {
        goToTheRuleDetailsOf(rule.name);

        cy.get(INTEGRATIONS).should('have.length', rule.integrations.length);
        cy.get(INTEGRATIONS_STATUS).should('have.length', rule.integrations.length);

        rule.integrations.forEach((integration, index) => {
          let expectedStatus = integration.installed ? 'Installed' : 'Not installed';
          if (integration.enabled) expectedStatus += ': enabled';

          cy.get(INTEGRATIONS).eq(index).should('contain', integration.name);
          cy.get(INTEGRATIONS_STATUS).eq(index).should('have.text', expectedStatus);
        });
      });

      it('the alerts generated should have a "kibana.alert.rule.parameters.related_integrations" field containing the integrations', () => {
        const firstRule = 0;
        const relatedIntegrationsField = 'kibana.alert.rule.parameters.related_integrations';
        const expectedRelatedIntegrationsText =
          '{"package":"system","version":"1.17.0"}{"package":"aws","integration":"cloudtrail","version":"1.17.0"}{"package":"aws","integration":"cloudfront","version":"1.17.0"}{"package":"aws","integration":"unknown","version":"1.17.0"}';

        enableRule(firstRule);
        waitForRuleToUpdate();
        goToTheRuleDetailsOf(rule.name);
        waitForAlertsToPopulate();
        expandFirstAlert();
        openTable();
        filterBy(relatedIntegrationsField);
        cy.get(FIELD(relatedIntegrationsField)).should(
          'have.text',
          expectedRelatedIntegrationsText
        );
      });
    }
  );

  context('related Integrations Advanced Setting is disabled', () => {
    const rule = {
      name: 'Related integrations rule',
      integrations: ['Aws Cloudfront', 'Aws Cloudtrail', 'Aws Unknown', 'System'],
      enabledIntegrations: '0',
    };

    before(() => {
      cleanFleet().then(() => {
        disableRelatedIntegrations();
      });
    });

    after(() => {
      enableRelatedIntegrations();
    });

    beforeEach(() => {
      visit(DETECTIONS_RULE_MANAGEMENT_URL);
      waitForRulesTableToShow();
    });

    it('should not display a badge with the installed integrations on the rule management page', () => {
      cy.get(RULE_NAME).should('have.text', rule.name);
      cy.get(INTEGRATIONS).should('not.exist');
    });

    it('should display the integrations on the definition section', () => {
      goToTheRuleDetailsOf(rule.name);

      cy.get(INTEGRATIONS).should('have.length', rule.integrations.length);
      cy.get(INTEGRATIONS_STATUS).should('have.length', rule.integrations.length);

      rule.integrations.forEach((integration, index) => {
        cy.get(INTEGRATIONS).eq(index).should('contain', integration);
        cy.get(INTEGRATIONS_STATUS).eq(index).should('have.text', 'Not installed');
      });
    });
  });
});
