/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import archives_metadata from '../../../fixtures/es_archiver/archives_metadata';

const { start, end } = archives_metadata['apm_8.0.0'];

const serviceOverviewHref = url.format({
  pathname: '/app/apm/services/opbeans-node/transactions',
  query: { rangeFrom: start, rangeTo: end },
});

describe('Transactions Overview', () => {
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  it('persists transaction type selected when navigating to Overview tab', () => {
    cy.visit(serviceOverviewHref);
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
