/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PIN_EVENT } from '../screens/timeline';

import { loginAndWaitForPage } from '../tasks/login';
import { openTimeline } from '../tasks/security_main';
import { pinFirstEvent, populateTimeline, unpinFirstEvent } from '../tasks/timeline';

import { HOSTS_URL } from '../urls/navigation';

describe('timeline events', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_URL);
    openTimeline();
    populateTimeline();
  });

  after(() => {
    unpinFirstEvent();
  });

  it('pins the first event to the timeline', () => {
    cy.server();
    cy.route('POST', '**/api/solutions/security/graphql').as('persistTimeline');

    pinFirstEvent();

    cy.wait('@persistTimeline', { timeout: 10000 }).then((response) => {
      cy.wrap(response.status).should('eql', 200);
      cy.wrap(response.xhr.responseText).should('include', 'persistPinnedEventOnTimeline');
    });

    cy.get(PIN_EVENT).should('have.attr', 'aria-label', 'Pinned event');
  });
});
