/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { synthtrace } from '../../../synthtrace';
import { opbeans } from '../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const timeRange = {
  rangeFrom: start,
  rangeTo: end,
};
// flaky
describe.skip('Transaction details', () => {
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

  // skipping this as it´s been failing a lot lately, more information here https://github.com/elastic/kibana/issues/197386
  it.skip('shows transaction name and transaction charts', () => {
    cy.intercept('GET', '/internal/apm/services/opbeans-java/transactions/charts/latency?*').as(
      'transactionLatencyRequest'
    );

    cy.intercept('GET', '/internal/apm/services/opbeans-java/throughput?*').as(
      'transactionThroughputRequest'
    );

    cy.intercept('GET', '/internal/apm/services/opbeans-java/transactions/charts/error_rate?*').as(
      'transactionFailureRateRequest'
    );

    cy.visit(
      `/app/apm/services/opbeans-java/transactions/view?${new URLSearchParams({
        ...timeRange,
        transactionName: 'GET /api/product',
      })}`
    );

    cy.wait(
      [
        '@transactionLatencyRequest',
        '@transactionThroughputRequest',
        '@transactionFailureRateRequest',
      ],
      { timeout: 60000 }
    ).spread((latencyInterception, throughputInterception, failureRateInterception) => {
      expect(latencyInterception.request.query.transactionName).to.be.eql('GET /api/product');

      expect(
        (
          latencyInterception.response
            ?.body as APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>
        ).currentPeriod.latencyTimeseries[0].y
      ).to.eql(1000 * 1000);

      expect(throughputInterception.request.query.transactionName).to.be.eql('GET /api/product');

      expect(
        (
          throughputInterception.response
            ?.body as APIReturnType<'GET /internal/apm/services/{serviceName}/throughput'>
        ).currentPeriod[0].y
      ).to.eql(60);

      expect(failureRateInterception.request.query.transactionName).to.be.eql('GET /api/product');

      expect(
        (
          failureRateInterception.response
            ?.body as APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate'>
        ).currentPeriod.average
      ).to.eql(1);
    });

    cy.contains('h2', 'GET /api/product');
    cy.getByTestSubj('latencyChart');
    cy.getByTestSubj('throughput');
    cy.getByTestSubj('transactionBreakdownChart');
    cy.getByTestSubj('errorRate');
  });

  it('shows slo callout', () => {
    cy.visitKibana(
      `/app/apm/services/opbeans-java/transactions/view?${new URLSearchParams({
        ...timeRange,
        transactionName: 'GET 240rpm/75% 1000ms',
      })}`
    );
    cy.contains('Create SLO');
  });
  // skipping this as it´s been failing a lot lately, more information here https://github.com/elastic/kibana/issues/197386
  it.skip('shows top errors table', () => {
    cy.visitKibana(
      `/app/apm/services/opbeans-java/transactions/view?${new URLSearchParams({
        ...timeRange,
        transactionName: 'GET /api/product',
      })}`
    );

    cy.contains('Top 5 errors', { timeout: 30000 });
    cy.getByTestSubj('topErrorsForTransactionTable')
      .should('be.visible')
      .contains('a', '[MockError] Foo', { timeout: 10000 })
      .click();
    cy.url().should('include', 'opbeans-java/errors');
  });

  describe('when navigating to a trace sample', () => {
    it('keeps the same trace sample after reloading the page', () => {
      cy.visitKibana(
        `/app/apm/services/opbeans-java/transactions/view?${new URLSearchParams({
          ...timeRange,
          transactionName: 'GET /api/product',
        })}`
      );

      cy.getByTestSubj('pagination-button-last').click();
      cy.url().then((url) => {
        cy.reload();
        cy.url().should('eq', url);
      });
    });
  });

  describe('when changing filters which results in no trace samples', () => {
    it('trace waterfall must reset to empty state', () => {
      cy.visitKibana(
        `/app/apm/services/opbeans-java/transactions/view?${new URLSearchParams({
          ...timeRange,
          transactionName: 'GET /api/product',
        })}`
      );

      cy.getByTestSubj('apmWaterfallButton').should('exist');

      cy.getByTestSubj('apmUnifiedSearchBar').type(`_id: "123"`).type('{enter}');

      cy.getByTestSubj('apmWaterfallButton').should('not.exist');
      cy.getByTestSubj('apmNoTraceFound').should('exist');

      cy.reload();

      cy.getByTestSubj('apmNoTraceFound').should('exist');
    });
  });
});
