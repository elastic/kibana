/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HOST_STATS, NETWORK_STATS, OVERVIEW_EMPTY_PAGE } from '../screens/overview';

import { expandHostStats, expandNetworkStats } from '../tasks/overview';
import { loginAndWaitForPage } from '../tasks/login';

import { OVERVIEW_URL } from '../urls/navigation';
import { esArchiverUnload, esArchiverLoad } from '../tasks/es_archiver';

describe('Overview Page', () => {
  before(() => {
    cy.stubSearchStrategyApi('overviewHostQuery', 'overview_search_strategy');
    cy.stubSearchStrategyApi('overviewNetworkQuery', 'overview_search_strategy');
    loginAndWaitForPage(OVERVIEW_URL);
    cy.reload();
  });

  it('Host stats render with correct values', () => {
    expandHostStats();

    HOST_STATS.forEach((stat) => {
      cy.get(stat.domId).invoke('text').should('eq', stat.value);
    });
  });

  it('Network stats render with correct values', () => {
    expandNetworkStats();

    NETWORK_STATS.forEach((stat) => {
      cy.get(stat.domId).invoke('text').should('eq', stat.value);
    });
  });

  describe('with no data', () => {
    before(() => {
      esArchiverUnload('auditbeat');
      loginAndWaitForPage(OVERVIEW_URL);
    });

    after(() => {
      esArchiverLoad('auditbeat');
    });

    it('Splash screen should be here', () => {
      cy.get(OVERVIEW_EMPTY_PAGE).should('be.visible');
    });
  });
});
