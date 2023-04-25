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

// Skipping these for now as the feature is protected behind a feature flag set to false by default
// To run the tests locally, add 'securityFlyoutEnabled' in the Cypress config.ts here https://github.com/elastic/kibana/blob/main/x-pack/test/security_solution_cypress/config.ts#L50
describe.skip('Expandable flyout state sync', { testIsolation: false }, () => {
  const rule = getNewRule();

  before(() => {
    cleanKibana();
    login();
    createRule(rule);
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
});
