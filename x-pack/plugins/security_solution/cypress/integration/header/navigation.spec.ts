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
  USERS,
  DETECTION_RESPONSE,
  DASHBOARDS,
  CSP_DASHBOARD,
  KUBERNETES,
  INDICATORS,
  BLOCKLIST,
  CSP_BENCHMARKS,
  CSP_FINDINGS,
  POLICIES,
  EXPLORE,
  MANAGE,
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
  USERS_URL,
  DASHBOARDS_URL,
  DETECTION_RESPONSE_URL,
  EXPLORE_URL,
  MANAGE_URL,
  CSP_DASHBOARD_URL,
  KUBERNETES_URL,
  BLOCKLIST_URL,
  CSP_BENCHMARKS_URL,
  CSP_FINDINGS_URL,
  POLICIES_URL,
  INDICATORS_URL,
} from '../../urls/navigation';
import {
  openKibanaNavigation,
  navigateFromKibanaCollapsibleTo,
} from '../../tasks/kibana_navigation';
import {
  CASES_PAGE,
  ALERTS_PAGE,
  EXPLORE_PAGE,
  MANAGE_PAGE,
  DASHBOARDS_PAGE,
  TIMELINES_PAGE,
  FINDINGS_PAGE,
  THREAT_INTELLIGENCE_PAGE,
} from '../../screens/kibana_navigation';

before(() => {
  login();
});

describe('top-level navigation common to all pages in the Security app', () => {
  before(() => {
    visit(TIMELINES_URL);
  });

  it('navigates to the Dashboards landing page', () => {
    navigateFromHeaderTo(DASHBOARDS);
    cy.url().should('include', DASHBOARDS_URL);
  });

  it('navigates to the Overview page', () => {
    navigateFromHeaderTo(OVERVIEW);
    cy.url().should('include', OVERVIEW_URL);
  });

  it('navigates to the Detection & Response page', () => {
    navigateFromHeaderTo(DETECTION_RESPONSE);
    cy.url().should('include', DETECTION_RESPONSE_URL);
  });

  it('navigates to the Kubernetes page', () => {
    navigateFromHeaderTo(KUBERNETES);
    cy.url().should('include', KUBERNETES_URL);
  });

  it('navigates to the CSP dashboard page', () => {
    navigateFromHeaderTo(CSP_DASHBOARD);
    cy.url().should('include', CSP_DASHBOARD_URL);
  });

  it('navigates to the Alerts page', () => {
    navigateFromHeaderTo(ALERTS);
    cy.url().should('include', ALERTS_URL);
  });

  it('navigates to the Findings page', () => {
    navigateFromHeaderTo(CSP_FINDINGS);
    cy.url().should('include', CSP_FINDINGS_URL);
  });

  it('navigates to the Timelines page', () => {
    navigateFromHeaderTo(TIMELINES);
    cy.url().should('include', TIMELINES_URL);
  });

  it('navigates to the Explore landing page', () => {
    navigateFromHeaderTo(EXPLORE);
    cy.url().should('include', EXPLORE_URL);
  });

  it('navigates to the Hosts page', () => {
    navigateFromHeaderTo(HOSTS);
    cy.url().should('include', HOSTS_URL);
  });

  it('navigates to the Network page', () => {
    navigateFromHeaderTo(NETWORK);
    cy.url().should('include', NETWORK_URL);
  });

  it('navigates to the Users page', () => {
    navigateFromHeaderTo(USERS);
    cy.url().should('include', USERS_URL);
  });

  it('navigates to the Indicators page', () => {
    navigateFromHeaderTo(INDICATORS);
    cy.url().should('include', INDICATORS_URL);
  });

  it('navigates to the Rules page', () => {
    navigateFromHeaderTo(RULES);
    cy.url().should('include', DETECTIONS_RULE_MANAGEMENT_URL);
  });

  it('navigates to the Exceptions page', () => {
    navigateFromHeaderTo(EXCEPTIONS);
    cy.url().should('include', EXCEPTIONS_URL);
  });

  it('navigates to the Cases page', () => {
    navigateFromHeaderTo(CASES);
    cy.url().should('include', CASES_URL);
  });

  it('navigates to the Manage landing page', () => {
    navigateFromHeaderTo(MANAGE);
    cy.url().should('include', MANAGE_URL);
  });

  it('navigates to the Endpoints page', () => {
    navigateFromHeaderTo(ENDPOINTS);
    cy.url().should('include', ENDPOINTS_URL);
  });
  it('navigates to the Policies page', () => {
    navigateFromHeaderTo(POLICIES);
    cy.url().should('include', POLICIES_URL);
  });
  it('navigates to the Trusted Apps page', () => {
    navigateFromHeaderTo(TRUSTED_APPS);
    cy.url().should('include', TRUSTED_APPS_URL);
  });
  it('navigates to the Event Filters page', () => {
    navigateFromHeaderTo(EVENT_FILTERS);
    cy.url().should('include', EVENT_FILTERS_URL);
  });
  it('navigates to the Blocklist page', () => {
    navigateFromHeaderTo(BLOCKLIST);
    cy.url().should('include', BLOCKLIST_URL);
  });
  it('navigates to the CSP Benchmarks page', () => {
    navigateFromHeaderTo(CSP_BENCHMARKS);
    cy.url().should('include', CSP_BENCHMARKS_URL);
  });
});

describe('Kibana navigation to all pages in the Security app ', () => {
  before(() => {
    visit(KIBANA_HOME);
  });
  beforeEach(() => {
    openKibanaNavigation();
  });
  it('navigates to the Dashboards page', () => {
    navigateFromKibanaCollapsibleTo(DASHBOARDS_PAGE);
    cy.url().should('include', DASHBOARDS_URL);
  });

  it('navigates to the Alerts page', () => {
    navigateFromKibanaCollapsibleTo(ALERTS_PAGE);
    cy.url().should('include', ALERTS_URL);
  });

  it('navigates to the Findings page', () => {
    navigateFromKibanaCollapsibleTo(FINDINGS_PAGE);
    cy.url().should('include', CSP_FINDINGS_URL);
  });

  it('navigates to the Timelines page', () => {
    navigateFromKibanaCollapsibleTo(TIMELINES_PAGE);
    cy.url().should('include', TIMELINES_URL);
  });

  it('navigates to the Cases page', () => {
    navigateFromKibanaCollapsibleTo(CASES_PAGE);
    cy.url().should('include', CASES_URL);
  });

  it('navigates to the Explore page', () => {
    navigateFromKibanaCollapsibleTo(EXPLORE_PAGE);
    cy.url().should('include', EXPLORE_URL);
  });

  it('navigates to the Threat Intelligence page', () => {
    navigateFromKibanaCollapsibleTo(THREAT_INTELLIGENCE_PAGE);
    cy.url().should('include', INDICATORS_URL);
  });

  it('navigates to the Manage page', () => {
    navigateFromKibanaCollapsibleTo(MANAGE_PAGE);
    cy.url().should('include', MANAGE_URL);
  });
});
