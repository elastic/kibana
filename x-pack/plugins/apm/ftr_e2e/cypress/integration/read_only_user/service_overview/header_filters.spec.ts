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
  pathname: '/app/apm/services/opbeans-node/overview',
  query: { rangeFrom: start, rangeTo: end },
});

const apisToIntercept = [
  {
    endpoint: '/api/apm/services/opbeans-node/transactions/charts/latency?*',
    name: 'latencyChartRequest',
  },
  {
    endpoint: '/api/apm/services/opbeans-node/throughput?*',
    name: 'throughputChartRequest',
  },
  {
    endpoint: '/api/apm/services/opbeans-node/transactions/charts/error_rate?*',
    name: 'errorRateChartRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-node/transactions/groups/detailed_statistics?*',
    name: 'transactionGroupsDetailedRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-node/service_overview_instances/detailed_statistics?*',
    name: 'instancesDetailedRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-node/service_overview_instances/main_statistics?*',
    name: 'instancesMainStatisticsRequest',
  },
  {
    endpoint: '/api/apm/services/opbeans-node/error_groups/main_statistics?*',
    name: 'errorGroupsMainStatisticsRequest',
  },
  {
    endpoint: '/api/apm/services/opbeans-node/transaction/charts/breakdown?*',
    name: 'transactonBreakdownRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-node/transactions/groups/main_statistics?*',
    name: 'transactionsGroupsMainStatisticsRequest',
  },
];

describe('Service overview - header filters', () => {
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  describe('Filtering by transaction type', () => {
    it('changes url when selecting different value', () => {
      cy.visit(serviceOverviewHref);
      cy.contains('opbeans-node');
      cy.url().should('not.include', 'transactionType');
      cy.get('[data-test-subj="headerFilterTransactionType"]').should(
        'have.value',
        'request'
      );
      cy.get('[data-test-subj="headerFilterTransactionType"]').select('Worker');
      cy.url().should('include', 'transactionType=Worker');
      cy.get('[data-test-subj="headerFilterTransactionType"]').should(
        'have.value',
        'Worker'
      );
    });

    it('calls APIs with correct transaction type', () => {
      apisToIntercept.map(({ endpoint, name }) => {
        cy.intercept('GET', endpoint).as(name);
      });
      cy.visit(serviceOverviewHref);
      cy.contains('opbeans-node');
      cy.get('[data-test-subj="headerFilterTransactionType"]').should(
        'have.value',
        'request'
      );

      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: apisToIntercept.map(({ name }) => `@${name}`),
        value: 'transactionType=request',
      });

      cy.get('[data-test-subj="headerFilterTransactionType"]').select('Worker');
      cy.url().should('include', 'transactionType=Worker');
      cy.get('[data-test-subj="headerFilterTransactionType"]').should(
        'have.value',
        'Worker'
      );
      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: apisToIntercept.map(({ name }) => `@${name}`),
        value: 'transactionType=Worker',
      });
    });
  });

  describe('Filtering by kuerybar', () => {
    it('filters by transaction.name', () => {
      cy.visit(
        url.format({
          pathname: '/app/apm/services/opbeans-java/overview',
          query: { rangeFrom: start, rangeTo: end },
        })
      );
      cy.contains('opbeans-java');
      cy.get('[data-test-subj="headerFilterKuerybar"]').type('transaction.n');
      cy.contains('transaction.name');
      cy.get('[data-test-subj="suggestionContainer"]')
        .find('li')
        .first()
        .click();
      cy.get('[data-test-subj="headerFilterKuerybar"]').type(':');
      cy.get('[data-test-subj="suggestionContainer"]')
        .find('li')
        .first()
        .click();
      cy.get('[data-test-subj="suggestionContainer"]').realPress('{enter}');
      cy.url().should('include', '&kuery=transaction.name');
    });
  });
});
