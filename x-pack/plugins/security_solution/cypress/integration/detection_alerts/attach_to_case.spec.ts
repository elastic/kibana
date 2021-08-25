/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { ROLES } from '../../../common/test';

import { loadAlertsTableWithAlerts } from '../../tasks/alerts';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, waitForPageWithoutDateRange } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';
import { ATTACH_ALERT_TO_CASE_BUTTON, TIMELINE_CONTEXT_MENU_BTN } from '../../screens/alerts';

const loadDetectionsPage = (role: ROLES) => {
  waitForPageWithoutDateRange(ALERTS_URL, role);
  waitForAlertsToPopulate();
};

describe('Alerts timeline', () => {
  before(() => {
    // First we login as a privileged user to create alerts.
    cleanKibana();
    loadAlertsTableWithAlerts(getNewRule());

    // Then we login as read-only user to test.
    login(ROLES.reader);
  });

  context('Privileges: read only', () => {
    beforeEach(() => {
      loadDetectionsPage(ROLES.reader);
    });

    it('should not allow user with read only privileges to attach alerts to cases', () => {
      // Read only user is read for cases AND alerts, leaving no actions
      // for user to take from table. If this test is failing, it's likely
      // a new action has been added and either not put behind privileges
      // logic or is an action that a read only user can take
      cy.get(TIMELINE_CONTEXT_MENU_BTN).should('not.exist');
    });
  });

  context('Privileges: can crud', () => {
    beforeEach(() => {
      loadDetectionsPage(ROLES.platform_engineer);
    });

    it('should allow a user with crud privileges to attach alerts to cases', () => {
      cy.get(TIMELINE_CONTEXT_MENU_BTN).first().click({ force: true });
      cy.get(ATTACH_ALERT_TO_CASE_BUTTON).first().should('not.be.disabled');
    });
  });
});
