/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INSPECT_HOSTS_BUTTONS_IN_SECURITY,
  INSPECT_MODAL,
  VIZ_ACTIONS_HOSTS_BUTTONS_IN_SECURITY,
  VIZ_ACTIONS_HOSTS_DETAILS_BUTTONS_IN_SECURITY,
} from '../../screens/inspect';
import { HOST_OVERVIEW } from '../../screens/hosts/main';
import { cleanKibana } from '../../tasks/common';

import { clickInspectButton, closesModal, openStatsAndTables } from '../../tasks/inspect';
import { loginAndWaitForHostDetailsPage, loginAndWaitForPage } from '../../tasks/login';

import { HOSTS_URL } from '../../urls/navigation';
import { clickVizActionsInspect } from '../../tasks/visualization_actions';

describe('Visualization actions', () => {
  before(() => {
    cleanKibana();
  });
  context('Hosts', () => {
    before(() => {
      loginAndWaitForPage(HOSTS_URL);
    });
    afterEach(() => {
      closesModal();
    });

    VIZ_ACTIONS_HOSTS_BUTTONS_IN_SECURITY.forEach((button) =>
      it(`inspects the ${button.title}`, () => {
        if (button.tabId) {
          cy.get(button.tabId).click();
        }
        cy.get(button.id).click({ force: true });

        clickVizActionsInspect();
        cy.get(INSPECT_MODAL).should('be.visible');
      })
    );
  });

  context('Host details', () => {
    before(() => {
      loginAndWaitForHostDetailsPage();
    });
    afterEach(() => {
      closesModal();
    });

    VIZ_ACTIONS_HOSTS_DETAILS_BUTTONS_IN_SECURITY.forEach((button) =>
      it(`inspects the ${button.title}`, () => {
        if (button.tabId) {
          cy.get(button.tabId).click();
        }
        cy.get(button.id).click({ force: true });

        clickVizActionsInspect();
        cy.get(INSPECT_MODAL).should('be.visible');
      })
    );
  });
});
