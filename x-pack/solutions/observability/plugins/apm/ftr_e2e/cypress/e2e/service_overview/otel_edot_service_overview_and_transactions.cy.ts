/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { ApmSynthtracePipelineSchema } from '@kbn/apm-synthtrace-client';
import { synthtrace } from '../../../synthtrace';
import { adserviceEdot } from '../../fixtures/synthtrace/adservice_edot';
import { checkA11y } from '../../support/commands';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';
const serviceInstanceId = 'da7a8507-53be-421c-8d77-984f12397213';

const serviceOverviewPath = '/app/apm/services/adservice-edot-synth/overview';
const baseUrl = url.format({
  pathname: serviceOverviewPath,
  query: { rangeFrom: start, rangeTo: end },
});

const transactionTabPath = '/app/apm/services/adservice-edot-synth/transactions/view';
const transactionUrl = url.format({
  pathname: transactionTabPath,
  query: { rangeFrom: start, rangeTo: end, transactionName: 'oteldemo.AdServiceEdotSynth/GetAds' },
});

describe('Service Overview', () => {
  before(() => {
    synthtrace.index(
      adserviceEdot({
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
      cy.contains('adservice-edot-synth');
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
      cy.intercept('GET', '/internal/apm/services/adservice-edot-synth/metadata/details?*').as(
        'metadataDetailsRequest'
      );

      cy.visitKibana(baseUrl);

      cy.getByTestSubj('opentelemetry').click();
      cy.wait('@metadataDetailsRequest');
      cy.contains('dt', 'Language');
      cy.contains('dd', 'java');
    });
  });

  describe('instances table', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    it('has data in the table', () => {
      cy.visitKibana(baseUrl);
      cy.contains('adservice-edot-synth');
      cy.getByTestSubj('serviceInstancesTableContainer');
      cy.contains(serviceInstanceId);
    });
  });

  describe('transactions', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    it('navigates to transaction detail page', () => {
      cy.visitKibana(baseUrl);
      cy.contains('Transactions').click();

      cy.contains('a', 'oteldemo.AdServiceEdotSynth/GetAds').click();
      cy.contains('h5', 'oteldemo.AdServiceEdotSynth/GetAds');
    });
    it('shows transaction summary', () => {
      cy.visitKibana(transactionUrl);

      cy.getByTestSubj('apmHttpInfoRequestMethod').should('exist');
      cy.getByTestSubj('apmHttpInfoRequestMethod').contains('GET');
      cy.getByTestSubj('apmHttpInfoUrl').should('exist');
      cy.getByTestSubj('apmHttpInfoUrl').contains(
        'https://otel-demo-blue-adservice-edot-synth:8080/some/path'
      );
      cy.getByTestSubj('apmHttpInfoRequestMethod').should('exist');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').should('exist');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').contains('OK');
    });
    it('shows waterfall and transaction details flyout', () => {
      cy.visitKibana(transactionUrl);

      cy.getByTestSubj('apmWaterfallButton').should('exist');
      cy.getByTestSubj('waterfall').should('exist');
      cy.getByTestSubj('waterfallItem').should('exist');
      cy.getByTestSubj('waterfallItem').click();
      cy.contains('h4', 'Transaction details');
      cy.getByTestSubj('apmTransactionDetailLinkLink').should('exist');
      cy.getByTestSubj('apmTransactionDetailLinkLink').contains(
        'oteldemo.AdServiceEdotSynth/GetAds'
      );
      cy.getByTestSubj('apmServiceListAppLink').should('exist');
      cy.getByTestSubj('apmServiceListAppLink').contains('adservice-edot-synth');
      cy.getByTestSubj('apmHttpInfoRequestMethod').should('exist');
      cy.getByTestSubj('apmHttpInfoRequestMethod').contains('GET');
      cy.getByTestSubj('apmHttpInfoUrl').should('exist');
      cy.getByTestSubj('apmHttpInfoUrl').contains(
        'https://otel-demo-blue-adservice-edot-synth:8080/some/path'
      );
      cy.getByTestSubj('apmHttpInfoRequestMethod').should('exist');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').should('exist');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').contains('OK');
    });
  });

  describe('errors', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana(baseUrl);
      cy.contains('adservice-edot-synth');
      cy.contains('a', 'View errors').click();
    });

    it('navigates to the errors page', () => {
      cy.url().should('include', '/adservice-edot-synth/errors');
    });

    it('navigates to error detail page and shows error summary', () => {
      cy.contains('a', '[ResponseError] index_not_found_exception').click();
      cy.contains('div', '[ResponseError] index_not_found_exception');

      cy.getByTestSubj('apmHttpInfoRequestMethod').should('exist');
      cy.getByTestSubj('apmHttpInfoRequestMethod').contains('GET');
      cy.getByTestSubj('apmHttpInfoUrl').should('exist');
      cy.getByTestSubj('apmHttpInfoUrl').contains(
        'https://otel-demo-blue-adservice-edot-synth:8080/some/path'
      );
      cy.getByTestSubj('apmHttpInfoRequestMethod').should('exist');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').should('exist');
      cy.getByTestSubj('apmUiSharedHttpStatusCodeBadge').contains('OK');
    });
  });
});
