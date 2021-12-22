/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loginAndWaitForPage } from '../../tasks/login';

import { HOSTS_URL } from '../../urls/navigation';

describe('RiskyHosts KPI', () => {
  it('renders', () => {
    loginAndWaitForPage(HOSTS_URL);

    cy.get('[data-test-subj="riskyHostsTotal"]').should('have.text', '0 Risky Hosts');
    cy.get('[data-test-subj="riskyHostsCriticalQuantity"]').should('have.text', '0 hosts');
    cy.get('[data-test-subj="riskyHostsHighQuantity"]').should('have.text', '0 hosts');
  });
});
