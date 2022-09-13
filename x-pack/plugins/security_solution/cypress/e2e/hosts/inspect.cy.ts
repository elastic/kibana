/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSPECT_HOSTS_BUTTONS_IN_SECURITY, INSPECT_MODAL } from '../../screens/inspect';
import { HOST_OVERVIEW } from '../../screens/hosts/main';

import { clickInspectButton, closesModal, openStatsAndTables } from '../../tasks/inspect';

import { login, visit, visitHostDetailsPage } from '../../tasks/login';

import { HOSTS_URL } from '../../urls/navigation';

describe('Inspect', () => {
  before(() => {
    login();
  });
  context('Hosts stats and tables', () => {
    before(() => {
      visit(HOSTS_URL);
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

  context('Hosts details', () => {
    before(() => {
      visitHostDetailsPage('test.local');
    });

    it(`inspects the host details`, () => {
      clickInspectButton(HOST_OVERVIEW);
      cy.get(INSPECT_MODAL).should('be.visible');
    });
  });
});
