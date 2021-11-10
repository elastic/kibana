/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceOverviewPath = '/app/apm/services/opbeans-java/transactions/view';
const baseUrl = url.format({
  pathname: serviceOverviewPath,
  query: {
    rangeFrom: start,
    rangeTo: end,
    transactionName: 'GET /api/product',
  },
});

describe('Transaction Detail', () => {
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

  it('the transaction type selector is populated', () => {
    cy.visit(baseUrl);
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'request'
    );
  });

  it('the transaction group name is displayed', () => {
    cy.visit(baseUrl);
    cy.contains('h2', 'GET /api/product');
  });

  it('the latency chart is rendered', () => {
    cy.visit(baseUrl);
    cy.get('[data-cy="transaction-latency-chart"]');
  });

  it('the throughput chart is rendered', () => {
    cy.visit(baseUrl);
    cy.get('[data-cy="transaction-throughput-chart"]');
  });

  it('the failed transaction rate chart is rendered', () => {
    cy.visit(baseUrl);
    cy.get('[data-cy="transaction-failed-transaction-chart"]');
  });

  it('the breakdown chart is rendered', () => {
    cy.visit(baseUrl);
    cy.get('[data-cy="transaction-breakdown-chart"]');
  });

  it('the trace sample tab is rendered', () => {
    cy.visit(baseUrl);
    cy.get('[data-test-subj="apmTraceSamplesTabButton"]');
  });

  it('API calls are made', () => {
    apisToIntercept.map(({ method, endpoint, name }) => {
      cy.intercept(method, endpoint).as(name);
    });
    cy.visit(baseUrl);
    cy.wait(apisToIntercept.map(({ name }) => `@${name}`));
  });

  const apisToIntercept = [
    {
      method: 'POST',
      endpoint: '/internal/apm/data_view/static',
      name: 'dataViewStaticRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/has_data',
      name: 'hasDataRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/services/opbeans-java/agent?*',
      name: 'getServiceAgentRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/services/opbeans-java/transaction_types?*',
      name: 'getServiceTransactionTypesRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/settings/anomaly-detection/jobs',
      name: 'getAnomalyDetectionJobsRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/services/opbeans-java/metadata/icons?*',
      name: 'getServiceIconsRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/environments?*',
      name: 'getEnvironmentsRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/data_view/dynamic',
      name: 'dataViewDynamicRequest',
    },
    {
      method: 'POST',
      endpoint: '/internal/apm/latency/overall_distribution',
      name: 'latencyDistributionRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/fallback_to_transactions?*',
      name: 'getFallbackToTransactionsRequest',
    },
    {
      method: 'GET',
      endpoint:
        '/internal/apm/services/opbeans-java/transactions/charts/latency?*',
      name: 'latencyChartRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/services/opbeans-java/throughput?*',
      name: 'throughputChartRequest',
    },
    {
      method: 'GET',
      endpoint:
        '/internal/apm/services/opbeans-java/transactions/charts/error_rate?*',
      name: 'failedTransactionsChartRequest',
    },
    {
      method: 'GET',
      endpoint:
        '/internal/apm/services/opbeans-java/transaction/charts/breakdown?*',
      name: 'breakdownChartRequest',
    },
    {
      method: 'GET',
      endpoint:
        '/internal/apm/services/opbeans-java/transactions/traces/samples?*',
      name: 'getTransactionSamplesRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/services/opbeans-java/alerts?*',
      name: 'getServiceAlertsRequest',
    },
    {
      method: 'GET',
      endpoint: '/internal/apm/traces/*',
      name: 'getTraceWaterfallRequest',
    },
  ];

  describe('and scrolling down to the trace waterfall', () => {
    beforeEach(() => {
      cy.visit(baseUrl);
      cy.get('[data-test-subj="transactionDetailWaterfallAccordian"]')
        .first()
        .as('transactionWaterfallItemWrapper');
      cy.get('@transactionWaterfallItemWrapper')
        .find('[data-test-subj="transactionDetailWaterfallAccordian"]')
        .first()
        .find('button')
        .first()
        .as('spanWaterfallItem');
      cy.get('@transactionWaterfallItemWrapper')
        .find('button')
        .first()
        .as('transactionWaterfallItem');
      cy.get('@transactionWaterfallItem').scrollIntoView();
    });

    it('the services involved in the trace are displayed', () => {
      cy.get('[data-test-subj="traceWaterfallTimelineLegend"]').as('legend');
      cy.get('@legend').should('have.length', 2);
      cy.get('@legend').contains('opbeans-java');
      cy.get('@legend').contains('postgresql');
    });

    it('items can be collapsed and expanded', () => {
      cy.get('[data-test-subj="transactionDetailWaterfallAccordian"]').should(
        'have.length',
        2
      );
      cy.get('@transactionWaterfallItem').should(
        'have.attr',
        'aria-expanded',
        'true'
      );
      cy.get('@transactionWaterfallItem').click('left');
      cy.get('@transactionWaterfallItem').should(
        'have.attr',
        'aria-expanded',
        'false'
      );
      cy.get('@transactionWaterfallItem').click('left');
      cy.get('@transactionWaterfallItem').should(
        'have.attr',
        'aria-expanded',
        'true'
      );
    });

    it('opens a flyout when clicking on a transaction or span', () => {
      cy.get('@transactionWaterfallItem').click();
      cy.get('[role="dialog"]').contains('h4', 'Transaction details');
      cy.get('[data-test-subj="euiFlyoutCloseButton"]').click();

      cy.get('@spanWaterfallItem').click();
      cy.get('[role="dialog"]').contains('h2', 'Span details');
      cy.get('[data-test-subj="euiFlyoutCloseButton"]').click();
    });

    it('displays metadata when clicking on the metadata tab', () => {
      cy.get('[data-test-subj="transactionDetailsMetadataTab"]').click();
      cy.get('[data-test-subj="apmMetadataTable"]');
    });

    it.skip('displays samples from selected range in latency distribution chart', () => {});
  });
});
