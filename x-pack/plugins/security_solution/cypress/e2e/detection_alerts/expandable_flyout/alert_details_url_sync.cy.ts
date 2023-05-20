/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { cleanKibana } from '../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { expandFirstAlertExpandableFlyout } from '../../../tasks/document_expandable_flyout';
import { login, visit } from '../../../tasks/login';
import { createRule } from '../../../tasks/api_calls/rules';
import { ALERTS_URL } from '../../../urls/navigation';
import {
  DOCUMENT_DETAILS_FLYOUT_CLOSE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE,
} from '../../../screens/document_expandable_flyout';

describe(
  'Expandable flyout state sync',
  { env: { ftrConfig: { enableExperimental: ['securityFlyoutEnabled'] } } },
  () => {
    const rule = getNewRule();

    before(() => {
      cleanKibana();
      createRule(rule);
    });

    beforeEach(() => {
      login();
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
    });

    it('should serialize its state to url', () => {
      cy.url().should('include', 'eventFlyout');
      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE).should('be.visible').and('have.text', rule.name);
    });

    it('should reopen the flyout after browser refresh', () => {
      cy.reload();

      cy.url().should('include', 'eventFlyout');
      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE).should('be.visible').and('have.text', rule.name);
    });

    it('should clear the url state when flyout is closed', () => {
      cy.reload();

      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE).should('be.visible').and('have.text', rule.name);

      cy.get(DOCUMENT_DETAILS_FLYOUT_CLOSE_BUTTON).click();

      cy.url().should('not.include', 'eventFlyout');
    });
  }
);
