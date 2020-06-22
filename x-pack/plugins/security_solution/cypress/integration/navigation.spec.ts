/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ALERTS, HOSTS, NETWORK, OVERVIEW, TIMELINES } from '../screens/security_header';

import { loginAndWaitForPage } from '../tasks/login';
import { navigateFromHeaderTo } from '../tasks/security_header';

import { TIMELINES_PAGE } from '../urls/navigation';

describe('top-level navigation common to all pages in the Security app', () => {
  before(() => {
    loginAndWaitForPage(TIMELINES_PAGE);
  });
  it('navigates to the Overview page', () => {
    navigateFromHeaderTo(OVERVIEW);
    cy.url().should('include', '/security/overview');
  });

  it('navigates to the Hosts page', () => {
    navigateFromHeaderTo(HOSTS);
    cy.url().should('include', '/security/hosts');
  });

  it('navigates to the Network page', () => {
    navigateFromHeaderTo(NETWORK);
    cy.url().should('include', '/security/network');
  });

  it('navigates to the Alerts page', () => {
    navigateFromHeaderTo(ALERTS);
    cy.url().should('include', '/security/alerts');
  });

  it('navigates to the Timelines page', () => {
    navigateFromHeaderTo(TIMELINES);
    cy.url().should('include', '/security/timelines');
  });
});
