/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVER_SIDE_EVENT_COUNT } from '../screens/timeline';

import { loginAndWaitForPage } from '../tasks/login';
import { openTimeline } from '../tasks/security_main';
import { executeTimelineKQL } from '../tasks/timeline';

import { HOSTS_URL } from '../urls/navigation';

describe('timeline search or filter KQL bar', () => {
  beforeEach(() => {
    loginAndWaitForPage(HOSTS_URL);
  });

  it('executes a KQL query', () => {
    const hostExistsQuery = 'host.name: *';
    openTimeline();
    executeTimelineKQL(hostExistsQuery);

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((strCount) => {
        const intCount = +strCount;
        cy.wrap(intCount).should('be.above', 0);
      });
  });
});
