/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSPECT_MODAL } from '../../screens/inspect';
import {
  CREATE_CASE_FLYOUT,
  SAVE_LENS_MODAL,
  SELECT_CASE_MODAL,
  VIZ_ACTIONS_BUTTONS_IN_SECURITY,
} from '../../screens/visualization_actions';
import { cleanKibana } from '../../tasks/common';

import { closesModal } from '../../tasks/inspect';
import { loginAndWaitForPage } from '../../tasks/login';
import {
  clickVizActionsAddToExistingCase,
  clickVizActionsAddToNewCase,
  clickVizActionsButton,
  clickVizActionsInspect,
  clickVizActionsOpenInLens,
  clickVizActionsSave,
  closeAllCasesModal,
  closeCreateCaseFlyout,
  closeSaveObjectModal,
  vizActionsMenuShouldBeClosed,
} from '../../tasks/visualization_actions';

import { NETWORK_URL } from '../../urls/navigation';

describe('Visualization actions', () => {
  context('inspect', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(NETWORK_URL);
    });

    VIZ_ACTIONS_BUTTONS_IN_SECURITY.forEach((button) => {
      it(`inspects the ${button.title}`, () => {
        clickVizActionsButton(button.id, button.tabId);
        clickVizActionsInspect();
        vizActionsMenuShouldBeClosed();
        cy.get(INSPECT_MODAL).should('be.visible');
        closesModal();
      });

      it(`save the ${button.title}`, () => {
        clickVizActionsButton(button.id, button.tabId);
        clickVizActionsSave();
        vizActionsMenuShouldBeClosed();
        cy.get(SAVE_LENS_MODAL).should('be.visible');

        closeSaveObjectModal();
      });

      it(`open the ${button.title} chart in Lens`, () => {
        clickVizActionsButton(button.id, button.tabId);

        cy.window().then((win) => {
          cy.stub(win, 'open').as('openInLens');
        });
        clickVizActionsOpenInLens();
        vizActionsMenuShouldBeClosed();

        cy.get('@openInLens').should('be.called');
      });

      it(`add the ${button.title} chart to a new case`, () => {
        clickVizActionsButton(button.id, button.tabId);

        clickVizActionsAddToNewCase();
        vizActionsMenuShouldBeClosed();
        cy.get(CREATE_CASE_FLYOUT).should('exist');
        closeCreateCaseFlyout();
      });

      it(`add the ${button.title} chart to a new case`, () => {
        if (button.tabId) {
          cy.get(button.tabId).click();
        }
        cy.get(button.id).click({ force: true });

        clickVizActionsAddToExistingCase();
        vizActionsMenuShouldBeClosed();
        cy.get(SELECT_CASE_MODAL).should('exist');
        closeAllCasesModal();
      });
    });
  });
});
