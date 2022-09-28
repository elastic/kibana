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
  before(() => {
    synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
    cy.visitKibana(
      `/app/apm/services/opbeans-java/transactions/view?${new URLSearchParams({
        ...timeRange,
        transactionName: 'GET /api/product',
      })}`
    );
  });

  it('shows transaction name and transaction charts', () => {
    cy.contains('h2', 'GET /api/product');
    cy.get('[data-test-subj="latencyChart"]');
    cy.get('[data-test-subj="throughput"]');
    cy.get('[data-test-subj="transactionBreakdownChart"]');
    cy.get('[data-test-subj="errorRate"]');
  });

  it('shows top errors table', () => {
    cy.contains('Top 5 errors');
    cy.get('[data-test-subj="topErrorsForTransactionTable"]')
      .contains('a', '[MockError] Foo')
      .click();
    cy.url().should('include', 'opbeans-java/errors');
  });

  describe('when navigating to a trace sample', () => {
    it('keeps the same trace sample after reloading the page', () => {
      cy.get('[data-test-subj="pagination-button-last"]').click();
      cy.url().then((url) => {
        cy.reload();
        cy.url().should('eq', url);
      });
    });
  });
});
