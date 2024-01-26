/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clickRuleName } from './live_query';
import { ServerlessRoleName } from '../support/roles';
import { cleanupRule, loadRule } from './api_fixtures';
import { closeDateTabIfVisible } from './integrations';

export const RESPONSE_ACTIONS_ERRORS = 'response-actions-error';
export const RESPONSE_ACTIONS_ITEM_0 = 'response-actions-list-item-0';
export const RESPONSE_ACTIONS_ITEM_1 = 'response-actions-list-item-1';
export const RESPONSE_ACTIONS_ITEM_2 = 'response-actions-list-item-2';
export const RESPONSE_ACTIONS_ITEM_3 = 'response-actions-list-item-3';

export const OSQUERY_RESPONSE_ACTION_ADD_BUTTON = 'Osquery-response-action-type-selection-option';
export const ENDPOINT_RESPONSE_ACTION_ADD_BUTTON =
  'Endpoint Security-response-action-type-selection-option';

export const checkOsqueryResponseActionsPermissions = (enabled: boolean) => {
  let ruleId: string;
  let ruleName: string;

  before(() => {
    loadRule().then((data) => {
      ruleId = data.id;
      ruleName = data.name;
    });
  });
  after(() => {
    cleanupRule(ruleId);
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
  });

  it(`response actions should ${enabled ? 'be available ' : 'not be available'}`, () => {
    cy.visit('/app/security/rules');
    clickRuleName(ruleName);
    cy.getBySel('globalLoadingIndicator').should('not.exist');
    cy.getBySel('editRuleSettingsLink').click();
    cy.getBySel('globalLoadingIndicator').should('not.exist');
    closeDateTabIfVisible();
    cy.getBySel('edit-rule-actions-tab').click();
    cy.getBySel('globalLoadingIndicator').should('not.exist');
    cy.contains('Response actions are run on each rule execution.');
    cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();
    if (enabled) {
      cy.getBySel(ENDPOINT_RESPONSE_ACTION_ADD_BUTTON).click();
      cy.contains('Query is a required field');
      cy.contains('Select an endpoint response action.');
    } else {
      cy.contains('Upgrade your license to Endpoint Complete to use Osquery Response Actions.');
      cy.getBySel(ENDPOINT_RESPONSE_ACTION_ADD_BUTTON).should('be.disabled');
    }
  });
};
