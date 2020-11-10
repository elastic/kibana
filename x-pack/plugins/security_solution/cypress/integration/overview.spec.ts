/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HOST_STATS, NETWORK_STATS, OVERVIEW_EMPTY_PAGE } from '../screens/overview';

import { expandHostStats, expandNetworkStats } from '../tasks/overview';
import { loginAndWaitForPage } from '../tasks/login';

import { OVERVIEW_URL } from '../urls/navigation';

describe('Overview Page', () => {
  it('Host stats render with correct values', () => {
    cy.stubSearchStrategyApi('overview_search_strategy.json');
    loginAndWaitForPage(OVERVIEW_URL);
    expandHostStats();

    HOST_STATS.forEach((stat) => {
      cy.get(stat.domId).invoke('text').should('eq', stat.value);
    });
  });

  it('Network stats render with correct values', () => {
    cy.stubSearchStrategyApi('overview_search_strategy.json');
    loginAndWaitForPage(OVERVIEW_URL);
    expandNetworkStats();

    NETWORK_STATS.forEach((stat) => {
      cy.get(stat.domId).invoke('text').should('eq', stat.value);
    });
  });

  describe('with no data', () => {
    before(() => {
      cy.stubSearchStrategyApi('empty_instance.json', 'securitySolutionIndexFields');
      loginAndWaitForPage(OVERVIEW_URL);
    });

    it('Splash screen should be here', () => {
      cy.get(OVERVIEW_EMPTY_PAGE).should('be.visible');
    });
  });
});
