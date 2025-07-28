/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { synthtrace } from '../../../synthtrace';
import { checkA11y } from '../../support/commands';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const goServiceTransactionsHref = url.format({
  pathname: '/app/apm/services/service-go/transactions',
  query: { rangeFrom: start, rangeTo: end },
});

function generateData() {
  const transactionNames = ['GET', 'PUT', 'DELETE', 'UPDATE'].flatMap((method) =>
    [
      '/users',
      '/products',
      '/orders',
      '/customers',
      '/profile',
      '/categories',
      '/invoices',
      '/payments',
      '/cart',
      '/reviews',
    ].map((resource) => `${method} ${resource}`)
  );

  const nodeService = apm
    .service({
      name: `service-node`,
      environment: 'production',
      agentName: 'nodejs',
    })
    .instance('opbeans-node-prod-1');

  const goService = apm
    .service({
      name: `service-go`,
      environment: 'production',
      agentName: 'go',
    })
    .instance('opbeans-node-prod-1');

  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  const range = timerange(from, to);

  return range
    .interval('2m')
    .rate(1)
    .generator((timestamp) =>
      transactionNames.flatMap((transactionName) => [
        goService
          .transaction({
            transactionName,
            transactionType: 'request',
          })
          .timestamp(timestamp)
          .duration(500)
          .success(),
        ...['request', 'Worker'].map((type) =>
          nodeService
            .transaction({
              transactionName,
              transactionType: type,
            })
            .timestamp(timestamp)
            .duration(500)
            .success()
        ),
      ])
    );
}
describe('Transactions Overview', () => {
  before(() => {
    synthtrace.index(generateData());
  });

  after(() => {
    synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  it('has no detectable a11y violations on load', () => {
    cy.visitKibana(goServiceTransactionsHref);
    cy.get('a:contains(Transactions)').should('have.attr', 'aria-selected', 'true');
    // set skipFailures to true to not fail the test when there are accessibility failures
    checkA11y({ skipFailures: true });
  });

  it('persists transaction type selected when navigating to Overview tab', () => {
    const nodeServiceTransactionsHref = url.format({
      pathname: '/app/apm/services/service-node/transactions',
      query: { rangeFrom: start, rangeTo: end },
    });
    cy.visitKibana(nodeServiceTransactionsHref);
    cy.getByTestSubj('headerFilterTransactionType').should('have.value', 'request');
    cy.getByTestSubj('headerFilterTransactionType').select('Worker');
    cy.getByTestSubj('headerFilterTransactionType').should('have.value', 'Worker');
    cy.get('a[href*="/app/apm/services/service-node/overview"]').click();
    cy.getByTestSubj('headerFilterTransactionType').should('have.value', 'Worker');
  });

  it('includes the correct transactionNames in the detailed statistics request', () => {
    cy.visitKibana(goServiceTransactionsHref);

    cy.intercept('GET', '**/internal/apm/services/*/transactions/groups/detailed_statistics?*').as(
      'detailedStats'
    );

    cy.wait('@detailedStats').then((detailedInterception) => {
      const decodedUrl = decodeURIComponent(detailedInterception.request.url);
      expect(decodedUrl).to.include(
        'transactionNames=["DELETE /cart","DELETE /categories","DELETE /customers","DELETE /invoices","DELETE /orders","DELETE /payments","DELETE /products","DELETE /profile","DELETE /reviews","DELETE /users"]'
      );
    });
  });
});
