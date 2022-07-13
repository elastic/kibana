/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_LAYOUT_TITLE, INDICATORS_TABLE } from '../../screens/indicators';
import { login } from '../../tasks/login';

before(() => {
  login();
});

describe('Indicators page', () => {
  before(() => {
    cy.visit('/app/security/threat_intelligence');
  });

  it('should navigate to the indicators page, click on a flyout button and inspect flyout', () => {
    cy.get(DEFAULT_LAYOUT_TITLE).should('have.text', 'Indicators');

    cy.get(INDICATORS_TABLE).should('exist');
  });
});
