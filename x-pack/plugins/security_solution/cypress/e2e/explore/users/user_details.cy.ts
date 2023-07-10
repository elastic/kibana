/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_FLYOUT } from '../../../screens/alerts_details';
import { createRule } from '../../../tasks/api_calls/rules';
import { cleanKibana } from '../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { refreshPage } from '../../../tasks/security_header';
import { getNewRule } from '../../../objects/rule';
import { ALERTS_URL } from '../../../urls/navigation';
import {
  expandAlertTableCellValue,
  openUserDetailsFlyout,
  scrollAlertTableColumnIntoView,
} from '../../../tasks/alerts';
import { USER_COLUMN } from '../../../screens/alerts';

describe('user details flyout', () => {
  beforeEach(() => {
    cleanKibana();
    login();
  });

  it('shows user detail flyout from alert table', () => {
    visitWithoutDateRange(ALERTS_URL);
    createRule(getNewRule({ query: 'user.name:*' }));
    refreshPage();
    waitForAlertsToPopulate();

    scrollAlertTableColumnIntoView(USER_COLUMN);
    expandAlertTableCellValue(USER_COLUMN);
    openUserDetailsFlyout();

    cy.get(ALERT_FLYOUT).should('be.visible');
  });
});
