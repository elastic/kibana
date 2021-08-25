/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '../../../common/test';

import { loadAlertsTableWithAlerts } from '../../tasks/alerts';
import { cleanKibana } from '../../tasks/common';
import { waitForPageWithoutDateRange, login, postRoleAndUser } from '../../tasks/login';
import { getNewRule } from '../../objects/rule';

import { ALERTS_URL, OVERVIEW_URL, DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { ALERTS_NO_PERMISSIONS_MSG } from '../../screens/alerts';
import { ALERTS } from '../../screens/security_header';
import { ALERTS_HISTOGRAM_PANEL, EXTERNAL_ALERTS_HISTOGRAM_PANEL } from '../../screens/overview';

describe('No alerts privileges', () => {
  before(() => {
    postRoleAndUser(ROLES.minimal_all);
  });

  beforeEach(() => {
    cleanKibana();
    loadAlertsTableWithAlerts(getNewRule(), 1);
    login(ROLES.minimal_all);
  });

  context('On overview page', () => {
    beforeEach(() => {
      waitForPageWithoutDateRange(OVERVIEW_URL, ROLES.minimal_all);
    });

    it('does not show alerts related diagrams', () => {
      cy.get(ALERTS_HISTOGRAM_PANEL).should('not.exist');
      cy.get(EXTERNAL_ALERTS_HISTOGRAM_PANEL).should('not.exist');
    });
  });

  context('On alerts page', () => {
    beforeEach(() => {
      waitForPageWithoutDateRange(ALERTS_URL, ROLES.minimal_all);
    });

    it('displays permissions page when trying to access alerts page direct from url', () => {
      cy.get(ALERTS_NO_PERMISSIONS_MSG).should('be.visible');
    });

    it('does not show alerts page in navigation', () => {
      cy.get(ALERTS).should('not.exist');
    });
  });

  context('On rule details page', () => {
    beforeEach(() => {
      waitForPageWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL, ROLES.minimal_all);
    });

    it('does not display alerts tab', () => {
      cy.get(ALERTS_NO_PERMISSIONS_MSG).should('be.visible');
    });
  });
});
