/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INTEGRATIONS_POPOVER,
  INTEGRATIONS_POPOVER_TITLE,
} from '../../screens/alerts_detection_rules';
import { INTEGRATIONS } from '../../screens/rule_details';
import { goToTheRuleDetailsOf, openIntegrationsPopover } from '../../tasks/alerts_detection_rules';
import { importRule } from '../../tasks/api_calls/rules';
import { cleanKibana, cleanPackages } from '../../tasks/common';
import { installPackageWithPolicy } from '../../tasks/integrations';
import { login, visit } from '../../tasks/login';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

const rule = {
  name: 'Related integrations rule',
  integrations: [
    'Aws Cloudfront',
    'Aws Cloudtrail',
    'Aws Route53',
    'Endpoint Security',
    'Unknown Unknown',
    'Unknown2',
  ],
};

describe('Related integrations', () => {
  before(() => {
    cleanKibana();
    cleanPackages();
    login();
    importRule('related_integrations.ndjson');
    installPackageWithPolicy('aws', '1.11.0');
    visit(DETECTIONS_RULE_MANAGEMENT_URL);
  });

  it('should display a badge with the installed integrations on the rule management page', () => {
    cy.get(INTEGRATIONS_POPOVER).should('have.text', '0/6 integrations');
  });

  it('should display a popover when clicking the badge with the installed integrations on the rule management page', () => {
    openIntegrationsPopover();

    cy.get(INTEGRATIONS_POPOVER_TITLE).should(
      'have.text',
      `[${rule.integrations.length}] Related integrations available`
    );
    cy.get(INTEGRATIONS).should('have.length', rule.integrations.length);
    rule.integrations.forEach((integration, index) => {
      cy.get(INTEGRATIONS).eq(index).should('contain', integration);
    });
  });

  it('should display the integrations on the definition section', () => {
    goToTheRuleDetailsOf(rule.name);

    cy.get(INTEGRATIONS).should('have.length', rule.integrations.length);
    rule.integrations.forEach((integration, index) => {
      cy.get(INTEGRATIONS).eq(index).should('contain', integration);
    });
  });
});
