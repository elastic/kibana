/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';
import { checkA11y } from '../../../support/commands';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceTransactionsHref = url.format({
  pathname: '/app/apm/services/opbeans-node/transactions',
  query: { rangeFrom: start, rangeTo: end },
});

describe('Transactions Overview', () => {
  before(async () => {
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

  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  it('has no detectable a11y violations on load', () => {
    cy.visit(serviceTransactionsHref);
    cy.contains('aria-selected="true"', 'Transactions').should(
      'have.class',
      'euiTab-isSelected'
    );
    // set skipFailures to true to not fail the test when there are accessibility failures
    checkA11y({ skipFailures: true });
  });

  it('persists transaction type selected when navigating to Overview tab', () => {
    cy.visit(serviceTransactionsHref);
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'request'
    );
    cy.get('[data-test-subj="headerFilterTransactionType"]').select('Worker');
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'Worker'
    );
    cy.get('a[href*="/app/apm/services/opbeans-node/overview"]').click();
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'Worker'
    );
  });
});
