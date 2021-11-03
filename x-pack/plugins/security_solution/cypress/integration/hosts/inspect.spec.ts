/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSPECT_HOSTS_BUTTONS_IN_SECURITY, INSPECT_MODAL } from '../../screens/inspect';
import { HOST_OVERVIEW } from '../../screens/hosts/main';
import { cleanKibana } from '../../tasks/common';

import { clickInspectButton, closesModal, openStatsAndTables } from '../../tasks/inspect';
import { loginAndWaitForHostDetailsPage, loginAndWaitForPage } from '../../tasks/login';

import { HOSTS_URL } from '../../urls/navigation';

describe('Inspect', () => {
  before(() => {
    cleanKibana();
  });
  context('Hosts stats and tables', () => {
    before(() => {
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

  context('Hosts details', () => {
    before(() => {
      loginAndWaitForHostDetailsPage();
    });
    afterEach(() => {
      closesModal();
    });

    it(`inspects the host details`, () => {
      clickInspectButton(HOST_OVERVIEW);
      cy.get(INSPECT_MODAL).should('be.visible');
    });
  });
});
