/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtraceOtel } from '../../../synthtrace';
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

describe('Service Overview', () => {
  before(() => {
    synthtraceOtel.index(
      adserviceEdot({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtraceOtel.clean();
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
  });

  describe('errors', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana(baseUrl);
    });

    it('navigates to the errors page', () => {
      cy.contains('adservice-edot-synth');
      cy.contains('a', 'View errors').click();
      cy.url().should('include', '/adservice-edot-synth/errors');
    });
  });
});
