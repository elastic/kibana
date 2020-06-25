/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ALERTS,
  CASES,
  HOSTS,
  MANAGEMENT,
  NETWORK,
  OVERVIEW,
  TIMELINES,
} from '../screens/security_header';

import { loginAndWaitForPage } from '../tasks/login';
import { navigateFromHeaderTo } from '../tasks/security_header';

import {
  ALERTS_URL,
  CASES_URL,
  HOSTS_URL,
  KIBANA_HOME,
  MANAGEMENT_URL,
  NETWORK_URL,
  OVERVIEW_URL,
  TIMELINES_URL,
} from '../urls/navigation';
import { openKibanaNavigation, navigateFromKibanaCollapsibleTo } from '../tasks/kibana_navigation';
import {
  ALERTS_PAGE,
  CASES_PAGE,
  HOSTS_PAGE,
  MANAGEMENT_PAGE,
  NETWORK_PAGE,
  OVERVIEW_PAGE,
  TIMELINES_PAGE,
} from '../screens/kibana_navigation';

describe('top-level navigation common to all pages in the Security app', () => {
  before(() => {
    loginAndWaitForPage(TIMELINES_URL);
  });

  it('navigates to the Overview page', () => {
    navigateFromHeaderTo(OVERVIEW);
    cy.url().should('include', OVERVIEW_URL);
  });

  it('navigates to the Alerts page', () => {
    navigateFromHeaderTo(ALERTS);
    cy.url().should('include', ALERTS_URL);
  });

  it('navigates to the Hosts page', () => {
    navigateFromHeaderTo(HOSTS);
    cy.url().should('include', HOSTS_URL);
  });

  it('navigates to the Network page', () => {
    navigateFromHeaderTo(NETWORK);
    cy.url().should('include', NETWORK_URL);
  });

  it('navigates to the Timelines page', () => {
    navigateFromHeaderTo(TIMELINES);
    cy.url().should('include', TIMELINES_URL);
  });

  it('navigates to the Cases page', () => {
    navigateFromHeaderTo(CASES);
    cy.url().should('include', CASES_URL);
  });

  it('navigates to the Management page', () => {
    navigateFromHeaderTo(MANAGEMENT);
    cy.url().should('include', MANAGEMENT_URL);
  });
});

describe('Kibana navigation to all pages in the Security app ', () => {
  before(() => {
    loginAndWaitForPage(KIBANA_HOME);
  });
  beforeEach(() => {
    openKibanaNavigation();
  });
  it('navigates to the Overview page', () => {
    navigateFromKibanaCollapsibleTo(OVERVIEW_PAGE);
    cy.url().should('include', OVERVIEW_URL);
  });

  it('navigates to the Alerts page', () => {
    navigateFromKibanaCollapsibleTo(ALERTS_PAGE);
    cy.url().should('include', ALERTS_URL);
  });

  it('navigates to the Hosts page', () => {
    navigateFromKibanaCollapsibleTo(HOSTS_PAGE);
    cy.url().should('include', HOSTS_URL);
  });

  it('navigates to the Network page', () => {
    navigateFromKibanaCollapsibleTo(NETWORK_PAGE);
    cy.url().should('include', NETWORK_URL);
  });

  it('navigates to the Timelines page', () => {
    navigateFromKibanaCollapsibleTo(TIMELINES_PAGE);
    cy.url().should('include', TIMELINES_URL);
  });

  it('navigates to the Cases page', () => {
    navigateFromKibanaCollapsibleTo(CASES_PAGE);
    cy.url().should('include', CASES_URL);
  });

  it('navigates to the Management page', () => {
    navigateFromKibanaCollapsibleTo(MANAGEMENT_PAGE);
    cy.url().should('include', MANAGEMENT_URL);
  });
});
