/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanKibana } from '../../tasks/common';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { navigateToHostRiskDetailTab } from '../../tasks/host_risk';
import {
  HOST_BY_RISK_TABLE_CELL,
  HOST_BY_RISK_TABLE_FILTER,
  HOST_BY_RISK_TABLE_FILTER_CRITICAL,
} from '../../screens/hosts/host_risk';
import { loginAndWaitForPage } from '../../tasks/login';
import { HOSTS_URL } from '../../urls/navigation';

describe('risk tab', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('risky_hosts');
    loginAndWaitForPage(HOSTS_URL);
    navigateToHostRiskDetailTab();
  });

  after(() => {
    esArchiverUnload('risky_hosts');
  });

  it('renders the table', () => {
    cy.get(HOST_BY_RISK_TABLE_CELL).eq(3).should('have.text', 'siem-kibana');
    cy.get(HOST_BY_RISK_TABLE_CELL).eq(4).should('have.text', '21.00');
    cy.get(HOST_BY_RISK_TABLE_CELL).eq(5).should('have.text', 'Low');
  });

  it('filters the table', () => {
    cy.get(HOST_BY_RISK_TABLE_FILTER).click();
    cy.get(HOST_BY_RISK_TABLE_FILTER_CRITICAL).click();

    cy.get(HOST_BY_RISK_TABLE_CELL).eq(3).should('not.have.text', 'siem-kibana');
  });
});
