/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HOST_STATS, NETWORK_STATS, OVERVIEW_EMPTY_PAGE } from '../../screens/overview';

import { expandHostStats, expandNetworkStats } from '../../tasks/overview';
import { loginAndWaitForPage } from '../../tasks/login';

import { OVERVIEW_URL } from '../../urls/navigation';

import overviewFixture from '../../fixtures/overview_search_strategy.json';
import emptyInstance from '../../fixtures/empty_instance.json';
import { cleanKibana } from '../../tasks/common';
import { createTimeline, favoriteTimeline } from '../../tasks/api_calls/timelines';
import { getTimeline } from '../../objects/timeline';

describe('Overview Page', () => {
  before(() => {
    cleanKibana();
  });

  it('Host stats render with correct values', () => {
    cy.stubSearchStrategyApi(overviewFixture, 'overviewHost');
    loginAndWaitForPage(OVERVIEW_URL);
    expandHostStats();

    HOST_STATS.forEach((stat) => {
      cy.get(stat.domId).should('have.text', stat.value);
    });
  });

  it('Network stats render with correct values', () => {
    cy.stubSearchStrategyApi(overviewFixture, 'overviewNetwork');
    loginAndWaitForPage(OVERVIEW_URL);
    expandNetworkStats();

    NETWORK_STATS.forEach((stat) => {
      cy.get(stat.domId).should('have.text', stat.value);
    });
  });

  describe('with no data', () => {
    it('Splash screen should be here', () => {
      cy.stubSearchStrategyApi(emptyInstance, undefined, 'indexFields');
      loginAndWaitForPage(OVERVIEW_URL);
      cy.get(OVERVIEW_EMPTY_PAGE).should('be.visible');
    });
  });

  describe('Favorite Timelines', () => {
    it('should appear on overview page', () => {
      createTimeline(getTimeline())
        .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
        .then((timelineId: string) => {
          favoriteTimeline({ timelineId, timelineType: 'default' }).then(() => {
            cy.stubSearchStrategyApi(overviewFixture, 'overviewNetwork');
            loginAndWaitForPage(OVERVIEW_URL);
            cy.get('[data-test-subj="overview-recent-timelines"]').should(
              'contain',
              getTimeline().title
            );
          });
        });
    });
  });
});
