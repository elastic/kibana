/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { ApmSynthtracePipelineSchema } from '@kbn/apm-synthtrace-client';
import { synthtrace } from '../../../synthtrace';
import { sendotlp } from '../../fixtures/synthtrace/sendotlp';
import { checkA11y } from '../../support/commands';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';
const serviceInstanceId = '89117ac1-0dbf-4488-9e17-4c2c3b76943a';

const serviceOverviewPath = '/app/apm/services/sendotlp-otel-native-synth/overview';
const baseUrl = url.format({
  pathname: serviceOverviewPath,
  query: { rangeFrom: start, rangeTo: end },
});

const transactionTabPath = '/app/apm/services/sendotlp-otel-native-synth/transactions/view';
const transactionUrl = url.format({
  pathname: transactionTabPath,
  query: { rangeFrom: start, rangeTo: end, transactionName: 'parent-synth' },
});

describe('Service Overview', () => {
  before(() => {
    synthtrace.index(
      sendotlp({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      }),
      ApmSynthtracePipelineSchema.Otel
    );
  });

  after(() => {
    synthtrace.clean();
  });

  describe('renders', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana(baseUrl);
    });

    it('renders all components on the page', () => {
      cy.contains('sendotlp-otel-native-synth');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
      cy.getByTestSubj('latencyChart');
      cy.getByTestSubj('throughput');
      cy.getByTestSubj('transactionsGroupTable');
      cy.getByTestSubj('serviceOverviewErrorsTable');
      cy.getByTestSubj('dependenciesTable');
      cy.getByTestSubj('instancesLatencyDistribution');
      cy.getByTestSubj('serviceOverviewInstancesTable');
    });
  });

  describe('service icons', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    it('show information on click', () => {
      cy.intercept(
        'GET',
        '/internal/apm/services/sendotlp-otel-native-synth/metadata/details?*'
      ).as('metadataDetailsRequest');

      cy.visitKibana(baseUrl);

      cy.getByTestSubj('service').click();
      cy.wait('@metadataDetailsRequest');
      cy.contains('dt', 'Framework name');
      cy.contains('dd', 'sendotlp-otel-native-synth');

      cy.getByTestSubj('opentelemetry').click();
      cy.contains('dt', 'Language');
      cy.contains('dd', 'go');
    });
  });

  describe('instances table', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    it('has data in the table', () => {
      cy.visitKibana(baseUrl);
      cy.contains('sendotlp-otel-native-synth');
      cy.getByTestSubj('serviceInstancesTableContainer');
      cy.contains(serviceInstanceId);
    });
  });

  describe('transactions', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    it('persists transaction type selected when clicking on Transactions tab', () => {
      cy.intercept(
        'GET',
        '/internal/apm/services/sendotlp-otel-native-synth/transaction_types?*'
      ).as('transactionTypesRequest');

      cy.visitKibana(baseUrl);

      cy.wait('@transactionTypesRequest');

      cy.getByTestSubj('headerFilterTransactionType').should('have.value', 'request');
      cy.contains('Transactions').click();
      cy.getByTestSubj('headerFilterTransactionType').should('have.value', 'request');
      cy.contains('parent-synth');
    });

    it('navigates to transaction detail page', () => {
      cy.visitKibana(baseUrl);
      cy.contains('Transactions').click();

      cy.contains('a', 'parent-synth').click();
      cy.contains('h5', 'parent-synth');
    });
    it('shows transaction summary', () => {
      cy.visitKibana(transactionUrl);

      cy.getByTestSubj('apmHttpInfoRequestMethod').should('exist');
      cy.getByTestSubj('apmHttpInfoUrl').should('exist');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').should('exist');
    });

    it('shows waterfall and transaction details flyout', () => {
      cy.visitKibana(transactionUrl);

      cy.getByTestSubj('apmWaterfallButton').should('exist');
      cy.getByTestSubj('waterfall').should('exist');
      cy.getByTestSubj('waterfallItem').should('exist');
      cy.getByTestSubj('waterfallItem').first().click();
      cy.contains('h4', 'Transaction details');
      cy.getByTestSubj('apmTransactionDetailLinkLink').should('exist');
      cy.getByTestSubj('apmTransactionDetailLinkLink').contains('parent-synth');
      cy.getByTestSubj('apmServiceListAppLink').should('exist');
      cy.getByTestSubj('apmServiceListAppLink').contains('sendotlp-otel-native-synth');
      cy.getByTestSubj('apmHttpInfoRequestMethod').should('exist');
      cy.getByTestSubj('apmHttpInfoRequestMethod').contains('GET');
      cy.getByTestSubj('apmHttpInfoUrl').should('exist');
      cy.getByTestSubj('apmHttpInfoUrl').contains('https://elastic.co/');
      cy.getByTestSubj('apmHttpInfoRequestMethod').should('exist');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').should('exist');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').contains('OK');
    });
  });

  describe('errors', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana(baseUrl);
    });
    it('errors table is populated', () => {
      cy.contains('sendotlp-otel-native-synth');
      cy.contains('*errors.errorString');
    });

    it('navigates to the errors page', () => {
      cy.contains('sendotlp-otel-native-synth');
      cy.contains('a', 'View errors').click();
      cy.url().should('include', '/sendotlp-otel-native-synth/errors');
    });

    it('navigates to error detail page and checks error summary', () => {
      cy.contains('a', 'boom').click();
      cy.contains('div', 'boom');

      cy.getByTestSubj('apmHttpInfoRequestMethod').should('exist');
      cy.getByTestSubj('apmHttpInfoRequestMethod').contains('GET');
      cy.getByTestSubj('apmHttpInfoUrl').should('exist');
      cy.getByTestSubj('apmHttpInfoUrl').contains('https://elastic.co/');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').should('exist');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').contains('OK');
    });
  });
});
