/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loginAndWaitForHostDetailsPage } from '../../tasks/login';

import { cleanKibana } from '../../tasks/common';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { TABLE_CELL, TABLE_ROWS } from '../../screens/alerts_details';
import {
  navigateToHostRiskDetailTab,
  openRiskFlyout,
  waitForTableToLoad,
} from '../../tasks/host_risk';

describe('risk tab', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('risky_hosts');
  });

  after(() => {
    esArchiverUnload('risky_hosts');
  });

  it('renders risk tab', () => {
    loginAndWaitForHostDetailsPage('siem-kibana');
    navigateToHostRiskDetailTab();
    waitForTableToLoad();

    cy.get('[data-test-subj="topHostScoreContributors"]')
      .find(TABLE_ROWS)
      .within(() => {
        cy.get(TABLE_CELL).contains('Unusual Linux Username');
      });
  });

  it('shows risk information overlay when button is clicked', () => {
    loginAndWaitForHostDetailsPage('siem-kibana');
    navigateToHostRiskDetailTab();
    waitForTableToLoad();
    openRiskFlyout();

    cy.get('[data-test-subj="open-risk-information-flyout"] .euiFlyoutHeader').contains(
      'How is host risk calculated?'
    );
  });
});
