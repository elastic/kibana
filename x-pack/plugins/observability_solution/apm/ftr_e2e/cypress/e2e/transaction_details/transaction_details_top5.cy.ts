/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { synthtrace } from '../../../synthtrace';
import { opbeans } from '../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const timeRange = {
  rangeFrom: start,
  rangeTo: end,
};
// flaky
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
  });

  it('shows top errors table', { defaultCommandTimeout: 60000 }, () => {
    cy.visitKibana(
      `/app/apm/services/opbeans-java/transactions/view?${new URLSearchParams({
        ...timeRange,
        transactionName: 'GET /api/product',
      })}`
    );

    cy.contains('Top 5 errors');
    cy.get('[data-test-subj=topErrorsForTransactionTable]', { timeout: 60000 })
      .get('[data-test-subj=apmLegacyAPMLinkLink]', { timeout: 60000 })
      .contains('[MockError] Foo', { timeout: 60000 })
      .click();
    cy.url().should('include', 'opbeans-java/errors');
  });
});
