/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { ROLES } from '../../../common/test';

import { expandFirstAlertActions } from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana, waitForPageToBeLoaded } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, visit, waitForPageWithoutDateRange } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';
import { ATTACH_ALERT_TO_CASE_BUTTON, TIMELINE_CONTEXT_MENU_BTN } from '../../screens/alerts';
import { LOADING_INDICATOR } from '../../screens/security_header';

const loadDetectionsPage = (role: ROLES) => {
  waitForPageWithoutDateRange(ALERTS_URL, role);
  waitForAlertsToPopulate();
};

describe('Alerts timeline', () => {
  before(() => {
    // First we login as a privileged user to create alerts.
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  context('Privileges: read only', () => {
    beforeEach(() => {
      login(ROLES.reader);
      loadDetectionsPage(ROLES.reader);
      waitForPageToBeLoaded();
    });

    it('should not allow user with read only privileges to attach alerts to cases', () => {
      // Disabled actions for read only users are hidden, so actions button should not show
      cy.get(TIMELINE_CONTEXT_MENU_BTN).should('not.exist');
    });
  });

  context('Privileges: can crud', () => {
    beforeEach(() => {
      login(ROLES.platform_engineer);
      loadDetectionsPage(ROLES.platform_engineer);
      cy.get(LOADING_INDICATOR).should('not.exist'); // on CI, waitForPageToBeLoaded fails because the loading icon can't be found
    });

    it('should allow a user with crud privileges to attach alerts to cases', () => {
      expandFirstAlertActions();
      cy.get(ATTACH_ALERT_TO_CASE_BUTTON).first().should('not.be.disabled');
    });
  });
});
