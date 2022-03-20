/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loginAndWaitForHostDetailsPage } from '../../tasks/login';

import { cleanKibana } from '../../tasks/common';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import {
  navigateToHostRiskDetailTab,
  openRiskFlyout,
  waitForTableToLoad,
} from '../../tasks/host_risk';
import { RULE_NAME, RISK_FLYOUT } from '../../screens/hosts/host_risk';

describe('risk tab', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('risky_hosts');
    loginAndWaitForHostDetailsPage('siem-kibana');
    navigateToHostRiskDetailTab();
    waitForTableToLoad();
  });

  after(() => {
    esArchiverUnload('risky_hosts');
  });

  it('renders risk tab', () => {
    cy.get(RULE_NAME).eq(3).should('have.text', 'Unusual Linux Username');
  });

  it('shows risk information overlay when button is clicked', () => {
    openRiskFlyout();
    cy.get(RISK_FLYOUT).should('have.text', 'How is host risk calculated?');
  });
});
