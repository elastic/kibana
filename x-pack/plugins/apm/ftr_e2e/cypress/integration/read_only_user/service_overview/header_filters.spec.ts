/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import archives_metadata from '../../../fixtures/es_archiver/archives_metadata';
import { esArchiverLoad, esArchiverUnload } from '../../../tasks/es_archiver';

const { start, end } = archives_metadata['apm_8.0.0'];

const serviceOverviewPath = '/app/apm/services/kibana/overview';
const baseUrl = url.format({
  pathname: serviceOverviewPath,
  query: { rangeFrom: start, rangeTo: end },
});

const apisToIntercept = [
  {
    endpoint: '/api/apm/services/kibana/transactions/charts/latency',
    as: 'latencyChartRequest',
  },
  {
    endpoint: '/api/apm/services/kibana/throughput',
    as: 'throughputChartRequest',
  },
  {
    endpoint: '/api/apm/services/kibana/transactions/charts/error_rate',
    as: 'errorRateChartRequest',
  },
  {
    endpoint:
      '/api/apm/services/kibana/transactions/groups/detailed_statistics',
    as: 'transactionGroupsDetailedRequest',
  },
  {
    endpoint:
      '/api/apm/services/kibana/service_overview_instances/detailed_statistics',
    as: 'instancesDetailedRequest',
  },
  {
    endpoint:
      '/api/apm/services/kibana/service_overview_instances/main_statistics',
    as: 'instancesMainStatisticsRequest',
  },
  {
    endpoint: '/api/apm/services/kibana/error_groups/main_statistics',
    as: 'errorGroupsMainStatisticsRequest',
  },
  {
    endpoint: '/api/apm/services/kibana/transaction/charts/breakdown',
    as: 'transactonBreakdownRequest',
  },
  {
    endpoint: '/api/apm/services/kibana/transactions/groups/main_statistics',
    as: 'transactionsGroupsMainStatisticsRequest',
  },
];

describe('Service overview - header filters', () => {
  before(() => {
    esArchiverLoad('apm_8.0.0');
  });
  after(() => {
    esArchiverUnload('apm_8.0.0');
  });
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });
  describe('Filtering by transaction type', () => {
    it('changes url when selecting different value', () => {
      cy.visit(baseUrl);
      cy.contains('Kibana');
      cy.url().should('not.include', 'transactionType');
      cy.get('[data-test-subj="headerFilterTransactionType"]').should(
        'have.value',
        'request'
      );
      cy.get('[data-test-subj="headerFilterTransactionType"]').select(
        'taskManager'
      );
      cy.url().should('include', 'transactionType=taskManager');
      cy.get('[data-test-subj="headerFilterTransactionType"]').should(
        'have.value',
        'taskManager'
      );
    });

    it('calls APIs with correct transaction type', () => {
      apisToIntercept.map(({ endpoint, as }) => {
        cy.intercept('GET', endpoint).as(as);
      });
      cy.visit(baseUrl);
      cy.contains('Kibana');
      cy.get('[data-test-subj="headerFilterTransactionType"]').should(
        'have.value',
        'request'
      );

      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: apisToIntercept.map(({ as }) => `@${as}`),
        value: 'transactionType=request',
      });

      cy.get('[data-test-subj="headerFilterTransactionType"]').select(
        'taskManager'
      );
      cy.url().should('include', 'transactionType=taskManager');
      cy.get('[data-test-subj="headerFilterTransactionType"]').should(
        'have.value',
        'taskManager'
      );
      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: apisToIntercept.map(({ as }) => `@${as}`),
        value: 'transactionType=taskManager',
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
