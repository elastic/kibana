/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSPECT_MODAL, INSPECT_NETWORK_BUTTONS_IN_SECURITY } from '../../screens/inspect';
import { waitForPageToBeLoaded } from '../../tasks/common';

import { closesModal, openStatsAndTables } from '../../tasks/inspect';
import { login, visit } from '../../tasks/login';

import { NETWORK_URL } from '../../urls/navigation';

describe('Inspect', () => {
  context('Network stats and tables', () => {
    before(() => {
      login();
      visit(NETWORK_URL);
      waitForPageToBeLoaded();
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
});
