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
  HOST_BY_RISK_TABLE_HOSTNAME_CELL,
  HOST_BY_RISK_TABLE_PERPAGE_BUTTON,
  HOST_BY_RISK_TABLE_PERPAGE_OPTIONS,
  HOST_BY_RISK_TABLE_NEXT_PAGE_BUTTON,
} from '../../screens/hosts/host_risk';
import { loginAndWaitForPage } from '../../tasks/login';
import { HOSTS_URL } from '../../urls/navigation';
import { clearSearchBar, kqlSearch } from '../../tasks/security_header';

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
    kqlSearch('host.name: "siem-kibana" {enter}');
    cy.get(HOST_BY_RISK_TABLE_CELL).eq(3).should('have.text', 'siem-kibana');
    cy.get(HOST_BY_RISK_TABLE_CELL).eq(4).should('have.text', '21.00');
    cy.get(HOST_BY_RISK_TABLE_CELL).eq(5).should('have.text', 'Low');
    clearSearchBar();
  });

  it('filters the table', () => {
    cy.get(HOST_BY_RISK_TABLE_FILTER).click();
    cy.get(HOST_BY_RISK_TABLE_FILTER_CRITICAL).click();

    cy.get(HOST_BY_RISK_TABLE_CELL).eq(3).should('not.have.text', 'siem-kibana');

    // remove filter
    cy.get(HOST_BY_RISK_TABLE_FILTER_CRITICAL).click();
  });

  it('should be able to change items count per page', () => {
    cy.get(HOST_BY_RISK_TABLE_PERPAGE_BUTTON).click();
    cy.get(HOST_BY_RISK_TABLE_PERPAGE_OPTIONS).first().click();

    cy.get(HOST_BY_RISK_TABLE_HOSTNAME_CELL).should('have.length', 5);
  });

  it('should not allow page change when page is empty', () => {
    kqlSearch('host.name: "nonexistent_host" {enter}');
    cy.get(HOST_BY_RISK_TABLE_NEXT_PAGE_BUTTON).should(`not.exist`);
    clearSearchBar();
  });
});
