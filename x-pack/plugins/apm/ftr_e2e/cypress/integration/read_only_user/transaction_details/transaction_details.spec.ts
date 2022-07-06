/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const timeRange = {
  rangeFrom: start,
  rangeTo: end,
};

describe('Transaction details', () => {
  before(async () => {
    cy.loginAsViewerUser();

    cy.visit(
      `/app/apm/services/opbeans-java/transactions/view?${new URLSearchParams({
        ...timeRange,
        transactionName: 'GET /api/product',
      })}`
    );

    await synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(async () => {
    await synthtrace.clean();
  });

  it('shows transaction name', () => {
    cy.contains('h2', 'GET /api/product');
  });

  it('shows transaction charts', () => {
    cy.get('[data-test-subj="latencyChart"]');
    cy.get('[data-test-subj="throughput"]');
    cy.get('[data-test-subj="transactionBreakdownChart"]');
    cy.get('[data-test-subj="errorRate"]');
  });

  it('shows top errors table', () => {
    cy.contains('Top 5 errors');
    cy.get('[data-test-subj="top-errors-for-transaction-table"]')
      .contains('a', '[MockError] Foo')
      .click();
    cy.url().should('include', 'opbeans-java/errors');
  });
});
