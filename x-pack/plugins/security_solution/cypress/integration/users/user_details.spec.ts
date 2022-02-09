/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_FLYOUT,
  USER_COLUMN,
  CELL_EXPANSION_POPOVER,
  USER_DETAILS_LINK,
  CELL_EXPAND_VALUE,
} from '../../screens/alerts_details';

import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { getNewRule } from '../../objects/rule';

import { ALERTS_URL } from '../../urls/navigation';

describe('user details flyout', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    createCustomRuleActivated(getNewRule());
    refreshPage();
    waitForAlertsToPopulate();
  });

  it('shows user detail flyout from alert table', () => {
    cy.get(USER_COLUMN).eq(0).scrollIntoView();

    // Wait for data grid to populate column
    cy.waitUntil(() => cy.get(USER_COLUMN).then(($el) => $el.length > 1), {
      interval: 500,
      timeout: 12000,
    });

    cy.get(USER_COLUMN).eq(1).focus().find(CELL_EXPAND_VALUE).click({ force: true });

    cy.get(CELL_EXPANSION_POPOVER).find(USER_DETAILS_LINK).click();

    cy.get(ALERT_FLYOUT).should('be.visible');
  });
});
