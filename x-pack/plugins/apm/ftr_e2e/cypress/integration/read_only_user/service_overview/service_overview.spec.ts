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

const serviceOverviewPath = '/app/apm/services/opbeans-node/overview';
const baseUrl = url.format({
  pathname: serviceOverviewPath,
  query: { rangeFrom: start, rangeTo: end },
});

const apiRequestsToIntercept = [
  {
    endpoint:
      '/internal/apm/services/opbeans-node/transactions/groups/main_statistics?*',
    aliasName: 'transactionsGroupsMainStadisticsRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/errors/groups/main_statistics?*',
    aliasName: 'errorsGroupsMainStadisticsRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/transaction/charts/breakdown?*',
    aliasName: 'transactionsBreakdownRequest',
  },
  {
    endpoint: '/internal/apm/services/opbeans-node/dependencies?*',
    aliasName: 'dependenciesRequest',
  },
];

const apiRequestsToInterceptWithComparison = [
  {
    endpoint:
      '/internal/apm/services/opbeans-node/transactions/charts/latency?*',
    aliasName: 'latencyRequest',
  },
  {
    endpoint: '/internal/apm/services/opbeans-node/throughput?*',
    aliasName: 'throughputRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/transactions/charts/error_rate?*',
    aliasName: 'errorRateRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/transactions/groups/detailed_statistics?*',
    aliasName: 'transactionsGroupsDetailedStadisticsRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-node/service_overview_instances/main_statistics?*',
    aliasName: 'instancesMainStadisticsRequest',
  },

  {
    endpoint:
      '/internal/apm/services/opbeans-node/service_overview_instances/detailed_statistics?*',
    aliasName: 'instancesDetailedStadisticsRequest',
  },
];

const aliasNamesNoComparison = apiRequestsToIntercept.map(
  ({ aliasName }) => `@${aliasName}`
);

const aliasNamesWithComparison = apiRequestsToInterceptWithComparison.map(
  ({ aliasName }) => `@${aliasName}`
);

const aliasNames = [...aliasNamesNoComparison, ...aliasNamesWithComparison];

describe('Service Overview', () => {
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

  describe('renders', () => {
    before(() => {
      cy.loginAsReadOnlyUser();
      cy.visit(baseUrl);
    });

    it('has no detectable a11y violations on load', () => {
      cy.contains('opbeans-node');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
    });

    it('transaction latency chart', () => {
      cy.get('[data-test-subj="latencyChart"]');
    });

    it('throughput chart', () => {
      cy.get('[data-test-subj="throughput"]');
    });

    it('transactions group table', () => {
      cy.get('[data-test-subj="transactionsGroupTable"]');
    });

    it('error table', () => {
      cy.get('[data-test-subj="serviceOverviewErrorsTable"]');
    });

    it('dependencies table', () => {
      cy.get('[data-test-subj="dependenciesTable"]');
    });

    it('instances latency distribution chart', () => {
      cy.get('[data-test-subj="instancesLatencyDistribution"]');
    });

    it('instances table', () => {
      cy.get('[data-test-subj="serviceOverviewInstancesTable"]');
    });
  });

  describe('transactions', () => {
    beforeEach(() => {
      cy.loginAsReadOnlyUser();
      cy.visit(baseUrl);
    });

    it('persists transaction type selected when clicking on Transactions tab', () => {
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

  describe('when RUM service', () => {
    before(() => {
      cy.loginAsReadOnlyUser();
      cy.visit(
        url.format({
          pathname: '/app/apm/services/opbeans-rum/overview',
          query: { rangeFrom: start, rangeTo: end },
        })
      );
    });

    it('hides dependency tab when RUM service', () => {
      cy.intercept('GET', '/internal/apm/services/opbeans-rum/agent?*').as(
        'agentRequest'
      );
      cy.contains('Overview');
      cy.contains('Transactions');
      cy.contains('Error');
      cy.contains('Service Map');
      // Waits until the agent request is finished to check the tab.
      cy.wait('@agentRequest');
      cy.get('.euiTabs .euiTab__content').then((elements) => {
        elements.map((index, element) => {
          expect(element.innerText).to.not.equal('Dependencies');
        });
      });
    });
  });

  describe('Calls APIs', () => {
    beforeEach(() => {
      cy.loginAsReadOnlyUser();
      cy.visit(baseUrl);
      apiRequestsToIntercept.map(({ endpoint, aliasName }) => {
        cy.intercept('GET', endpoint).as(aliasName);
      });
      apiRequestsToInterceptWithComparison.map(({ endpoint, aliasName }) => {
        cy.intercept('GET', endpoint).as(aliasName);
      });
    });

    it('with the correct environment when changing the environment', () => {
      cy.wait(aliasNames, { requestTimeout: 10000 });

      cy.get('[data-test-subj="environmentFilter"]').select('production');

      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: aliasNames,
        value: 'environment=production',
      });
    });

    it('when clicking the refresh button', () => {
      cy.contains('Refresh').click();
      cy.wait(aliasNames, { requestTimeout: 10000 });
    });

    it('when selecting a different time range and clicking the update button', () => {
      cy.wait(aliasNames, { requestTimeout: 10000 });

      cy.selectAbsoluteTimeRange(
        'Oct 10, 2021 @ 01:00:00.000',
        'Oct 10, 2021 @ 01:30:00.000'
      );
      cy.contains('Update').click();

      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: aliasNames,
        value:
          'start=2021-10-10T00%3A00%3A00.000Z&end=2021-10-10T00%3A30%3A00.000Z',
      });
    });

    it('when selecting a different comparison window', () => {
      cy.get('[data-test-subj="comparisonSelect"]').should('have.value', 'day');

      // selects another comparison type
      cy.get('[data-test-subj="comparisonSelect"]').select('week');
      cy.get('[data-test-subj="comparisonSelect"]').should(
        'have.value',
        'week'
      );
      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: aliasNamesWithComparison,
        value: 'offset',
      });
    });
  });
});
