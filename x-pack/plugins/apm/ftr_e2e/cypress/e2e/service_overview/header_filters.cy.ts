/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import { synthtrace } from '../../../synthtrace';
import { opbeans } from '../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceOverviewHref = url.format({
  pathname: '/app/apm/services/opbeans-node/overview',
  query: { rangeFrom: start, rangeTo: end },
});

const apisToIntercept = [
  {
    endpoint:
      '/internal/apm/services/opbeans-node/transactions/charts/latency?*',
    name: 'latencyChartRequest',
  },
  {
    endpoint: '/internal/apm/services/opbeans-node/throughput?*',
    name: 'throughputChartRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/transactions/charts/error_rate?*',
    name: 'errorRateChartRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/transactions/groups/detailed_statistics?*',
    name: 'transactionGroupsDetailedRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/service_overview_instances/detailed_statistics?*',
    name: 'instancesDetailedRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/service_overview_instances/main_statistics?*',
    name: 'instancesMainStatisticsRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/transaction/charts/breakdown?*',
    name: 'transactonBreakdownRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/transactions/groups/main_statistics?*',
    name: 'transactionsGroupsMainStatisticsRequest',
  },
];

describe('Service overview - header filters', () => {
  before(() => {
    synthtrace.index(
      opbeans({ from: new Date(start).getTime(), to: new Date(end).getTime() })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  describe('Filtering by transaction type', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });
    it('changes url when selecting different value', () => {
      cy.visitKibana(serviceOverviewHref);
      cy.contains('opbeans-node');
      cy.url().should('not.include', 'transactionType');
      cy.getByTestSubj('headerFilterTransactionType').should(
        'have.value',
        'request'
      );
      cy.getByTestSubj('headerFilterTransactionType').select('Worker');
      cy.url().should('include', 'transactionType=Worker');
      cy.getByTestSubj('headerFilterTransactionType').should(
        'have.value',
        'Worker'
      );
    });

    it('calls APIs with correct transaction type', () => {
      apisToIntercept.map(({ endpoint, name }) => {
        cy.intercept('GET', endpoint).as(name);
      });
      cy.visitKibana(serviceOverviewHref);
      cy.getByTestSubj('headerFilterTransactionType').should(
        'have.value',
        'request'
      );

      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: apisToIntercept.map(({ name }) => `@${name}`),
        value: 'transactionType=request',
      });

      cy.getByTestSubj('headerFilterTransactionType').select('Worker');
      cy.url().should('include', 'transactionType=Worker');
      cy.getByTestSubj('headerFilterTransactionType').should(
        'have.value',
        'Worker'
      );
      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: apisToIntercept.map(({ name }) => `@${name}`),
        value: 'transactionType=Worker',
      });
    });
  });

  describe('Filtering by searchbar', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });
    it('filters by transaction.name', () => {
      cy.visitKibana(
        url.format({
          pathname: '/app/apm/services/opbeans-java/overview',
          query: { rangeFrom: start, rangeTo: end },
        })
      );
      cy.contains('opbeans-java');
      cy.getByTestSubj('apmUnifiedSearchBar').type('transaction.n');
      cy.contains('transaction.name');
      cy.getByTestSubj(
        'autocompleteSuggestion-field-transaction.name-'
      ).click();
      cy.getByTestSubj('apmUnifiedSearchBar').type(':');
      cy.getByTestSubj('autoCompleteSuggestionText').should('have.length', 1);
      cy.getByTestSubj(
        Cypress.$.escapeSelector(
          'autocompleteSuggestion-value-"GET-/api/product"-'
        )
      ).click();
      cy.getByTestSubj('apmUnifiedSearchBar').type('{enter}');
      cy.url().should(
        'include',
        '&kuery=transaction.name%20:%22GET%20%2Fapi%2Fproduct%22%20'
      );
    });
  });
});
