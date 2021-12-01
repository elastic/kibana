/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRUSTED_APPLICATIONS_LIST_COUNTER,
  TRUSTED_APPLICATIONS_LIST_ITEM_TITLE,
  TRUSTED_APPLICATIONS_LIST_ITEM_CRITERIA_CONDITION,
  TRUSTED_APPLICATIONS_LIST_ITEM_MENU_BUTTON,
  TRUSTED_APPLICATIONS_LIST_ITEM_EDIT_OPTION,
  TRUSTED_APPLICATIONS_FLYOUT_BY_POLICY_OPTION,
  TRUSTED_APPLICATIONS_FLYOUT_BY_POLICY_OPTIONS_LIST_BOX,
  TRUSTED_APPLICATIONS_FLYOUT_SAVE_BUTTON,
  TRUSTED_APPLICATIONS_LIST_ITEM_EFFECT_SCOPE_MENU_BUTTON,
  TRUSTED_APPLICATIONS_LIST_ITEM_EFFECT_SCOPE_MENU,
} from '../screens/trusted_apps';

import { login } from '../tasks/login';
import { goToTrustedApplicationsList } from '../tasks/trusted_apps';

describe('Check trusted apps after upgrade', () => {
  beforeEach(() => {
    login();
    goToTrustedApplicationsList();
  });

  it('Displays trusted apps list with a result from automation', () => {
    cy.getBySel(TRUSTED_APPLICATIONS_LIST_COUNTER).should(
      'have.text',
      'Showing 1 trusted application'
    );
    cy.getBySel(TRUSTED_APPLICATIONS_LIST_ITEM_TITLE)
      .first()
      .should('have.text', 'Trusted app from automation');
    cy.getBySel(TRUSTED_APPLICATIONS_LIST_ITEM_CRITERIA_CONDITION)
      .first()
      .should('have.text', 'AND process.executable.caselessIS testPath');
  });

  it('Assigns trusted app to a policy', () => {
    cy.getBySel(TRUSTED_APPLICATIONS_LIST_ITEM_MENU_BUTTON).click();
    cy.getBySel(TRUSTED_APPLICATIONS_LIST_ITEM_EDIT_OPTION).click();
    cy.getBySel(TRUSTED_APPLICATIONS_FLYOUT_BY_POLICY_OPTION).click();
    cy.getBySel(TRUSTED_APPLICATIONS_FLYOUT_BY_POLICY_OPTIONS_LIST_BOX)
      .contains('Endpoint integration')
      .click();
    cy.getBySel(TRUSTED_APPLICATIONS_FLYOUT_SAVE_BUTTON).click();
    cy.getBySel(TRUSTED_APPLICATIONS_LIST_ITEM_EFFECT_SCOPE_MENU_BUTTON).click();
    cy.get('div.euiProgress', { timeout: 12000 }).should('not.exist');
    cy.getBySel(TRUSTED_APPLICATIONS_LIST_ITEM_EFFECT_SCOPE_MENU)
      .contains('Endpoint integration')
      .should('have.text', 'Endpoint integrationView details');
  });
});
