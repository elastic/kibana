/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import archives_metadata from '../../../fixtures/es_archiver/archives_metadata';

const { start, end } = archives_metadata['apm_8.0.0'];

const serviceOverviewPath = '/app/apm/services/opbeans-node/overview';
const baseUrl = url.format({
  pathname: serviceOverviewPath,
  query: { rangeFrom: start, rangeTo: end },
});

describe('Service Overview', () => {
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  it('persists transaction type selected when clicking on Transactions tab', () => {
    cy.visit(baseUrl);
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'request'
    );
    cy.get('[data-test-subj="headerFilterTransactionType"]').select('Worker');
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'Worker'
    );
    cy.contains('Transactions').click();
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'Worker'
    );
  });

  it('persists transaction type selected when clicking on View Transactions link', () => {
    cy.visit(baseUrl);
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'request'
    );
    cy.get('[data-test-subj="headerFilterTransactionType"]').select('Worker');
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'Worker'
    );

    cy.contains('View transactions').click();
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'Worker'
    );
  });
});
