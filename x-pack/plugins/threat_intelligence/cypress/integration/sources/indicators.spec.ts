/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_LAYOUT_TITLE,
  FLYOUT_TABLE,
  FLYOUT_TITLE,
  INDICATORS_TABLE,
  TOGGLE_FLYOUT_BUTTON,
} from '../../screens/indicators';
import { login } from '../../tasks/login';

before(() => {
  login();
});

describe('Sources page', () => {
  before(() => {
    cy.visit('/app/security/threat_intelligence');
  });

  it('should work', () => {
    cy.get(DEFAULT_LAYOUT_TITLE).should('have.text', 'Indicators');
    cy.get(INDICATORS_TABLE).should('exist');
    cy.get(TOGGLE_FLYOUT_BUTTON).should('exist').first().click();
    cy.get(FLYOUT_TITLE).should('contain', 'Indicator:');
    cy.get(FLYOUT_TABLE).should('exist').and('contain.text', 'threat.indicator.type');
    // cy.get(FLYOUT_TABS).should('exist').and('have.length', 2).last().click();
    // cy.get(FLYOUT_JSON).should('exist').and('contain.text', 'threat.indicator.type');
  });
});
