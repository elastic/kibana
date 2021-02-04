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
  loginAndWaitForPageWithoutDateRange,
  waitForPageWithoutDateRange,
} from '../../tasks/login';
import { waitForAlertsIndexToBeCreated } from '../../tasks/alerts';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { createCustomRule, deleteCustomRule } from '../../tasks/api_calls/rules';
import { getCallOut, waitForCallOutToBeShown } from '../../tasks/common/callouts';
import { cleanKibana } from '../../tasks/common';

const loadPageAsPlatformEngineerUser = (url: string) => {
  waitForPageWithoutDateRange(url, ROLES.platform_engineer);
  waitForPageTitleToBeShown();
};

const waitForPageTitleToBeShown = () => {
  cy.get(PAGE_TITLE).should('be.visible');
};

describe('Detections > Need Admin Callouts indicating an admin is needed to migrate the alert data set', () => {
  const NEED_ADMIN_FOR_UPDATE_CALLOUT = 'need-admin-for-update-rules';
  const ALERTS_CALLOUT = 'read-only-access-to-alerts';
  const RULES_CALLOUT = 'read-only-access-to-rules';

  before(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL, ROLES.platform_engineer);
    waitForAlertsIndexToBeCreated();
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
      loadPageAsPlatformEngineerUser(DETECTIONS_URL);
    });

    it('We show the need admin primary callout', () => {
      waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
      getCallOut(ALERTS_CALLOUT).should('not.exist');
      getCallOut(RULES_CALLOUT).should('not.exist');
    });
  });

  context('On Rules Management page', () => {
    beforeEach(() => {
      loadPageAsPlatformEngineerUser(DETECTIONS_RULE_MANAGEMENT_URL);
    });

    it('We show 1 primary callout of need admin', () => {
      waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
      getCallOut(ALERTS_CALLOUT).should('not.exist');
      getCallOut(RULES_CALLOUT).should('not.exist');
    });
  });

  context('On Rule Details page', () => {
    beforeEach(() => {
      createCustomRule(newRule);
      loadPageAsPlatformEngineerUser(DETECTIONS_RULE_MANAGEMENT_URL);
      waitForPageTitleToBeShown();
      goToRuleDetails();
    });

    afterEach(() => {
      deleteCustomRule();
    });

    it('We show 1 primary callout', () => {
      waitForCallOutToBeShown(NEED_ADMIN_FOR_UPDATE_CALLOUT, 'primary');
      getCallOut(ALERTS_CALLOUT).should('not.exist');
      getCallOut(RULES_CALLOUT).should('not.exist');
    });
  });
});
