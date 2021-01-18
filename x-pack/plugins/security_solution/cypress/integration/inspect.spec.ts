/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  INSPECT_HOSTS_BUTTONS_IN_SECURITY,
  INSPECT_MODAL,
  INSPECT_NETWORK_BUTTONS_IN_SECURITY,
} from '../screens/inspect';
import { cleanKibana } from '../tasks/common';

import { closesModal, openStatsAndTables } from '../tasks/inspect';
import { loginAndWaitForPage } from '../tasks/login';
import { openTimelineUsingToggle } from '../tasks/security_main';
import { executeTimelineKQL, openTimelineInspectButton } from '../tasks/timeline';

import { HOSTS_URL, NETWORK_URL } from '../urls/navigation';

describe('Inspect', () => {
  context('Hosts stats and tables', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(HOSTS_URL);
    });
    afterEach(() => {
      closesModal();
    });

    INSPECT_HOSTS_BUTTONS_IN_SECURITY.forEach((table) =>
      it(`inspects the ${table.title}`, () => {
        openStatsAndTables(table);
        cy.get(INSPECT_MODAL).should('be.visible');
      })
    );
  });

  context('Network stats and tables', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(NETWORK_URL);
    });
    afterEach(() => {
      closesModal();
    });

    INSPECT_NETWORK_BUTTONS_IN_SECURITY.forEach((table) =>
      it(`inspects the ${table.title}`, () => {
        openStatsAndTables(table);
        cy.get(INSPECT_MODAL).should('be.visible');
      })
    );
  });

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
