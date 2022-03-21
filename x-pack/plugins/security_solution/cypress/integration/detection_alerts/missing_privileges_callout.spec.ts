/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '../../../common/test';
import { DETECTIONS_RULE_MANAGEMENT_URL, ALERTS_URL } from '../../urls/navigation';
import { getNewRule } from '../../objects/rule';
import { PAGE_TITLE } from '../../screens/common/page';

import {
  login,
  loginAndWaitForPageWithoutDateRange,
  waitForPageWithoutDateRange,
} from '../../tasks/login';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { createCustomRule, deleteCustomRule } from '../../tasks/api_calls/rules';
import { getCallOut, waitForCallOutToBeShown, dismissCallOut } from '../../tasks/common/callouts';
import { cleanKibana } from '../../tasks/common';

const loadPageAsReadOnlyUser = (url: string) => {
  waitForPageWithoutDateRange(url, ROLES.reader);
  waitForPageTitleToBeShown();
};

const loadPageAsPlatformEngineer = (url: string) => {
  waitForPageWithoutDateRange(url, ROLES.platform_engineer);
  waitForPageTitleToBeShown();
};

const reloadPage = () => {
  cy.reload();
  waitForPageTitleToBeShown();
};

const waitForPageTitleToBeShown = () => {
  cy.get(PAGE_TITLE).should('be.visible');
};

describe('Detections > Callouts', () => {
  const MISSING_PRIVILEGES_CALLOUT = 'missing-user-privileges';

  before(() => {
    // First, we have to open the app on behalf of a privileged user in order to initialize it.
    // Otherwise the app will be disabled and show a "welcome"-like page.
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(ALERTS_URL, ROLES.platform_engineer);

    // After that we can login as a read-only user.
    login(ROLES.reader);
  });

  context('indicating read-only access to resources', () => {
    context('On Detections home page', () => {
      beforeEach(() => {
        loadPageAsReadOnlyUser(ALERTS_URL);
      });

      it('We show one primary callout', () => {
        waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');
      });

      context('When a user clicks Dismiss on the callout', () => {
        it('We hide it and persist the dismissal', () => {
          waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');
          dismissCallOut(MISSING_PRIVILEGES_CALLOUT);
          reloadPage();
          getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
        });
      });
    });

    // FYI: Rules Management check moved to ../detection_rules/all_rules_read_only.spec.ts

    context('On Rule Details page', () => {
      beforeEach(() => {
        createCustomRule(getNewRule());
        loadPageAsReadOnlyUser(DETECTIONS_RULE_MANAGEMENT_URL);
        waitForPageTitleToBeShown();
        goToRuleDetails();
      });

      afterEach(() => {
        deleteCustomRule();
      });

      it('We show one primary callout', () => {
        waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');
      });

      context('When a user clicks Dismiss on the callouts', () => {
        it('We hide them and persist the dismissal', () => {
          waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');

          dismissCallOut(MISSING_PRIVILEGES_CALLOUT);
          reloadPage();

          getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
        });
      });
    });
  });

  context('indicating read-write access to resources', () => {
    context('On Detections home page', () => {
      beforeEach(() => {
        loadPageAsPlatformEngineer(ALERTS_URL);
      });

      it('We show no callout', () => {
        getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
      });
    });

    context('On Rules Management page', () => {
      beforeEach(() => {
        loadPageAsPlatformEngineer(DETECTIONS_RULE_MANAGEMENT_URL);
      });

      it('We show no callout', () => {
        getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
      });
    });

    context('On Rule Details page', () => {
      beforeEach(() => {
        createCustomRule(getNewRule());
        loadPageAsPlatformEngineer(DETECTIONS_RULE_MANAGEMENT_URL);
        waitForPageTitleToBeShown();
        goToRuleDetails();
      });

      afterEach(() => {
        deleteCustomRule();
      });

      it('We show no callouts', () => {
        getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
      });
    });
  });
});
