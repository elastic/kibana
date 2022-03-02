/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSPECT_MODAL, VIZ_ACTIONS_BUTTONS_IN_SECURITY } from '../../screens/inspect';
import { cleanKibana } from '../../tasks/common';

import { closesModal } from '../../tasks/inspect';
import { loginAndWaitForPage } from '../../tasks/login';
import { clickVizActionsInspect } from '../../tasks/visualization_actions';

import { NETWORK_URL } from '../../urls/navigation';

describe('Visualization actions', () => {
  context('inspect', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(NETWORK_URL);
    });
    afterEach(() => {
      closesModal();
    });

    VIZ_ACTIONS_BUTTONS_IN_SECURITY.forEach((button) =>
      it(`inspects the ${button.title}`, () => {
        cy.get(button.id).click({ force: true });

        clickVizActionsInspect();
        cy.get(INSPECT_MODAL).should('be.visible');
      })
    );
  });
});
