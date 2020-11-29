/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIMELINE_FLYOUT_HEADER, TIMELINE_DATA_PROVIDERS } from '../screens/timeline';

import { dragFirstHostToTimeline, waitForAllHostsToBeLoaded } from '../tasks/hosts/all_hosts';
import { loginAndWaitForPage } from '../tasks/login';
import { openTimelineUsingToggle, closeTimelineUsingToggle } from '../tasks/security_main';

import { HOSTS_URL } from '../urls/navigation';

describe('timeline flyout button', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_URL);
    waitForAllHostsToBeLoaded();
  });

  it('toggles open the timeline', () => {
    openTimelineUsingToggle();
    cy.get(TIMELINE_FLYOUT_HEADER).should('have.css', 'visibility', 'visible');
    closeTimelineUsingToggle();
  });

  it('sets the data providers background to euiColorSuccess with a 10% alpha channel when the user starts dragging a host, but is not hovering over the data providers area', () => {
    dragFirstHostToTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS)
      .filter(':visible')
      .should(
        'have.css',
        'background',
        'rgba(1, 125, 115, 0.1) none repeat scroll 0% 0% / auto padding-box border-box'
      );
  });
});
