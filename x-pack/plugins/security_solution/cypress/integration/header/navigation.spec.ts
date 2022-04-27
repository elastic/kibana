/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASES,
  ALERTS,
  HOSTS,
  ENDPOINTS,
  TRUSTED_APPS,
  EVENT_FILTERS,
  NETWORK,
  OVERVIEW,
  TIMELINES,
  RULES,
  EXCEPTIONS,
} from '../../screens/security_header';

import { login, visit } from '../../tasks/login';
import { navigateFromHeaderTo } from '../../tasks/security_header';

import {
  ALERTS_URL,
  CASES_URL,
  HOSTS_URL,
  KIBANA_HOME,
  ENDPOINTS_URL,
  TRUSTED_APPS_URL,
  EVENT_FILTERS_URL,
  NETWORK_URL,
  OVERVIEW_URL,
  TIMELINES_URL,
  EXCEPTIONS_URL,
  DETECTIONS_RULE_MANAGEMENT_URL,
} from '../../urls/navigation';
import {
  openKibanaNavigation,
  navigateFromKibanaCollapsibleTo,
} from '../../tasks/kibana_navigation';
import {
  CASES_PAGE,
  ALERTS_PAGE,
  HOSTS_PAGE,
  ENDPOINTS_PAGE,
  NETWORK_PAGE,
  OVERVIEW_PAGE,
  TIMELINES_PAGE,
} from '../../screens/kibana_navigation';

before(() => {
  login();
});

describe('top-level navigation common to all pages in the Security app', () => {
  before(() => {
    visit(TIMELINES_URL);
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

  it('navigates to the Rules page', () => {
    navigateFromHeaderTo(RULES);
    cy.url().should('include', DETECTIONS_RULE_MANAGEMENT_URL);
  });

  it('navigates to the Exceptions page', () => {
    navigateFromHeaderTo(EXCEPTIONS);
    cy.url().should('include', EXCEPTIONS_URL);
  });

  it('navigates to the Timelines page', () => {
    navigateFromHeaderTo(TIMELINES);
    cy.url().should('include', TIMELINES_URL);
  });

  it('navigates to the Cases page', () => {
    navigateFromHeaderTo(CASES);
    cy.url().should('include', CASES_URL);
  });

  it('navigates to the Endpoints page', () => {
    navigateFromHeaderTo(ENDPOINTS);
    cy.url().should('include', ENDPOINTS_URL);
  });
  it('navigates to the Trusted Apps page', () => {
    navigateFromHeaderTo(TRUSTED_APPS);
    cy.url().should('include', TRUSTED_APPS_URL);
  });
  it('navigates to the Event Filters page', () => {
    navigateFromHeaderTo(EVENT_FILTERS);
    cy.url().should('include', EVENT_FILTERS_URL);
  });
});

describe('Kibana navigation to all pages in the Security app ', () => {
  before(() => {
    visit(KIBANA_HOME);
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

  it('navigates to the Endpoints page', () => {
    navigateFromKibanaCollapsibleTo(ENDPOINTS_PAGE);
    cy.url().should('include', ENDPOINTS_URL);
  });
});
