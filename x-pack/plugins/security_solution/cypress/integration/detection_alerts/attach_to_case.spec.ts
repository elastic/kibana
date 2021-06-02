/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { newRule } from '../../objects/rule';
import { ROLES } from '../../../common/test';

import { waitForAlertsIndexToBeCreated, waitForAlertsPanelToBeLoaded } from '../../tasks/alerts';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, loginAndWaitForPage, waitForPageWithoutDateRange } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { DETECTIONS_URL } from '../../urls/navigation';
import { ATTACH_ALERT_TO_CASE_BUTTON } from '../../screens/alerts_detection_rules';

const loadDetectionsPage = (role: ROLES) => {
  waitForPageWithoutDateRange(DETECTIONS_URL, role);
  waitForAlertsToPopulate();
};

describe('Alerts timeline', () => {
  before(() => {
    // First we login as a privileged user to create alerts.
    cleanKibana();
    loginAndWaitForPage(DETECTIONS_URL, ROLES.platform_engineer);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(newRule);
    refreshPage();
    waitForAlertsToPopulate(500);

    // Then we login as read-only user to test.
    login(ROLES.reader);
  });

  context('Privileges: read only', () => {
    beforeEach(() => {
      loadDetectionsPage(ROLES.reader);
    });

    it('should not allow user with read only privileges to attach alerts to cases', () => {
      cy.get(ATTACH_ALERT_TO_CASE_BUTTON).first().should('be.disabled');
    });
  });

  context('Privileges: can crud', () => {
    beforeEach(() => {
      loadDetectionsPage(ROLES.platform_engineer);
    });

    it('should allow a user with crud privileges to attach alerts to cases', () => {
      cy.get(ATTACH_ALERT_TO_CASE_BUTTON).first().should('not.be.disabled');
    });
  });
});
