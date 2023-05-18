/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanKibana } from '../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { expandFirstAlertExpandableFlyout } from '../../../tasks/document_expandable_flyout';
import { login, visit } from '../../../tasks/login';
import { ALERTS_URL } from '../../../urls/navigation';

describe(
  'Expandable flyout left panel threat intelligence',
  { env: { ftrConfig: { enableExperimental: ['securityFlyoutEnabled'] } } },
  () => {
    before(() => {
      cleanKibana();
      login();
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
    });

    it('should serialize its state to url', () => {
      cy.url().should('include', 'eventFlyout');
    });
  }
);
