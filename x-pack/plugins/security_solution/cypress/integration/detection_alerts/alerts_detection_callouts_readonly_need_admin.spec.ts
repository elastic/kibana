/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '../../../common/test';
import { DETECTIONS_RULE_MANAGEMENT_URL, DETECTIONS_URL } from '../../urls/navigation';
import { newRule } from '../../objects/rule';
import { PAGE_TITLE } from '../../screens/common/page';

import {
  login,
  loginAndWaitForPageWithoutDateRange,
  waitForPageWithoutDateRange,
} from '../../tasks/login';
import { waitForAlertsIndexToBeCreated } from '../../tasks/alerts';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { createCustomRule, deleteCustomRule } from '../../tasks/api_calls/rules';
import { getCallOut, waitForCallOutToBeShown, dismissCallOut } from '../../tasks/common/callouts';
import { cleanKibana } from '../../tasks/common';

const loadPageAsReadOnlyUser = (url: string) => {
  waitForPageWithoutDateRange(url, ROLES.reader);
  waitForPageTitleToBeShown();
};

const reloadPage = () => {
  cy.reload();
  waitForPageTitleToBeShown();
};

const waitForPageTitleToBeShown = () => {
  cy.get(PAGE_TITLE).should('be.visible');
};

describe('Detections > Need Admin Callouts indicating an admin is needed to migrate the alert data set', () => {
  const ALERTS_CALLOUT = 'read-only-access-to-alerts';
  const RULES_CALLOUT = 'read-only-access-to-rules';
  const NEED_ADMIN_FOR_UPDATE_CALLOUT = 'need-admin-for-update-rules';

  before(() => {
    // First, we have to open the app on behalf of a privileged user in order to initialize it.
    // Otherwise the app will be disabled and show a "welcome"-like page.
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL, ROLES.platform_engineer);
    waitForAlertsIndexToBeCreated();

    // After that we can login as a read-only user.
    login(ROLES.reader);
  });

  beforeEach(() => {
    // Index mapping outdated is forced to return true as being outdated so that we get the
    // need admin callouts being shown.
    cy.intercept('GET', '/api/detection_engine/index', {
      index_mapping_outdated: true,
      name: '.siem-signals-default',
    });
  });

  context('On Detections home page', () => {
    beforeEach(() => {
      loadPageAsReadOnlyUser(DETECTIONS_URL);
    });

    it('We show the alerts and admin primary callout', () => {
      waitForCallOutToBeShown(ALERTS_CALLOUT, 'primary');
      waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
    });

    context('When a user clicks Dismiss on the callout', () => {
      it('We hide it and persist the dismissal but still show the admin callout', () => {
        waitForCallOutToBeShown(ALERTS_CALLOUT, 'primary');
        dismissCallOut(ALERTS_CALLOUT);
        reloadPage();
        getCallOut(ALERTS_CALLOUT).should('not.exist');
        waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
      });
    });
  });

  context('On Rules Management page', () => {
    beforeEach(() => {
      loadPageAsReadOnlyUser(DETECTIONS_RULE_MANAGEMENT_URL);
    });

    it('We show two primary callouts of the alert and the admin', () => {
      waitForCallOutToBeShown(RULES_CALLOUT, 'primary');
      waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
    });

    context('When a user clicks Dismiss on the callout', () => {
      it('We hide it and persist the dismissal', () => {
        waitForCallOutToBeShown(RULES_CALLOUT, 'primary');
        dismissCallOut(RULES_CALLOUT);
        reloadPage();
        getCallOut(RULES_CALLOUT).should('not.exist');
        waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
      });
    });
  });

  context('On Rule Details page', () => {
    beforeEach(() => {
      createCustomRule(newRule);
      loadPageAsReadOnlyUser(DETECTIONS_RULE_MANAGEMENT_URL);
      waitForPageTitleToBeShown();
      goToRuleDetails();
    });

    afterEach(() => {
      deleteCustomRule();
    });

    it('We show three primary callouts', () => {
      waitForCallOutToBeShown(ALERTS_CALLOUT, 'primary');
      waitForCallOutToBeShown(RULES_CALLOUT, 'primary');
      waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
    });

    context('When a user clicks Dismiss on the callouts', () => {
      it('We hide them and persist the dismissal', () => {
        waitForCallOutToBeShown(ALERTS_CALLOUT, 'primary');
        waitForCallOutToBeShown(RULES_CALLOUT, 'primary');
        waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');

        dismissCallOut(ALERTS_CALLOUT);
        reloadPage();

        getCallOut(ALERTS_CALLOUT).should('not.exist');
        getCallOut(RULES_CALLOUT).should('be.visible');

        dismissCallOut(RULES_CALLOUT);
        reloadPage();

        getCallOut(ALERTS_CALLOUT).should('not.exist');
        getCallOut(RULES_CALLOUT).should('not.exist');
        waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
      });
    });
  });
});
