/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { service, timerange } from '@elastic/apm-synthtrace';
import { getSynthtraceEsClient } from '../../../../synthtrace_es_client';

const esTarget = Cypress.env('ES_TARGET');
const synthtraceEsClient = getSynthtraceEsClient(esTarget);
const serviceName = 'synth-go';
const start = new Date('2021-01-01T00:00:00.000Z').getTime();
const end = new Date('2021-01-01T00:15:00.000Z').getTime();
const GO_PROD_RATE = 80;
const GO_PROD_DURATION = 1000;

console.log({ esTarget });

const serviceOverviewPath = '/app/apm/services/opbeans-node/overview';
const baseUrl = url.format({
  pathname: serviceOverviewPath,
  query: { rangeFrom: start, rangeTo: end },
});

describe('Service Overview', () => {
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  before(async () => {
    const serviceGoProdInstance = service(
      serviceName,
      'production',
      'go'
    ).instance('instance-a');

    await synthtraceEsClient.index([
      ...timerange(start, end)
        .interval('1m')
        .rate(GO_PROD_RATE)
        .flatMap((timestamp) =>
          serviceGoProdInstance
            .transaction('GET /api/product/list')
            .duration(GO_PROD_DURATION)
            .timestamp(timestamp)
            .serialize()
        ),
    ]);
  });

  after(() => synthtraceEsClient.clean());

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

  it('hides dependency tab when RUM service', () => {
    cy.intercept('GET', '/internal/apm/services/opbeans-rum/agent?*').as(
      'agentRequest'
    );
    cy.visit(
      url.format({
        pathname: '/app/apm/services/opbeans-rum/overview',
        query: { rangeFrom: start, rangeTo: end },
      })
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
