/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INSPECT_MODAL } from '../../screens/inspect';

import { loginAndWaitForPage } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { executeTimelineKQL, openTimelineInspectButton } from '../../tasks/timeline';

import { HOSTS_URL } from '../../urls/navigation';

describe('Inspect', () => {
  context('Timeline', () => {
    it('inspects the timeline', () => {
      const hostExistsQuery = 'host.name: *';
      loginAndWaitForPage(HOSTS_URL);
      openTimelineUsingToggle();
      executeTimelineKQL(hostExistsQuery);
      openTimelineInspectButton();
      cy.get(INSPECT_MODAL).should('be.visible');
    });
  });
});
