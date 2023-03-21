/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { generateSpanLinksData } from './generate_span_links_data';

const start = '2022-01-01T00:00:00.000Z';
const end = '2022-01-01T00:15:00.000Z';

function getServiceInventoryUrl({ serviceName }: { serviceName: string }) {
  return url.format({
    pathname: `/app/apm/services/${serviceName}`,
    query: {
      rangeFrom: start,
      rangeTo: end,
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      serviceGroup: '',
      transactionType: 'request',
      comparisonEnabled: true,
      offset: '1d',
    },
  });
}

describe('Span links', () => {
  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  describe('when data is loaded', () => {
    let ids: Awaited<ReturnType<typeof generateSpanLinksData>>;
    before(() => {
      ids = generateSpanLinksData();
    });

    after(() => {
      synthtrace.clean();
    });

    describe('span links count on trace waterfall', () => {
      it('Shows two children and no parents on producer-internal-only Span A', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'producer-internal-only' })
        );
        cy.contains('Transaction A').click();
        cy.contains('2 Span links');
        cy.getByTestSubj(
          `spanLinksBadge_${ids.producerInternalOnlyIds.spanAId}`
        ).realHover();
        cy.contains('2 Span links found');
        cy.contains('2 incoming');
        cy.contains('0 outgoing');
      });

      it('Shows one parent and one children on producer-external-only Span B', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'producer-external-only' })
        );
        cy.contains('Transaction B').click();
        cy.contains('2 Span links');
        cy.getByTestSubj(
          `spanLinksBadge_${ids.producerExternalOnlyIds.spanBId}`
        ).realHover();
        cy.contains('2 Span links found');
        cy.contains('1 incoming');
        cy.contains('1 outgoing');
      });

      it('Shows one parent and one children on producer-consumer Transaction C', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'producer-consumer' })
        );
        cy.contains('Transaction C').click();
        cy.contains('2 Span links');
        cy.getByTestSubj(
          `spanLinksBadge_${ids.producerConsumerIds.transactionCId}`
        ).realHover();
        cy.contains('2 Span links found');
        cy.contains('1 incoming');
        cy.contains('1 outgoing');
      });

      it('Shows no parent and one children on producer-consumer Span C', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'producer-consumer' })
        );
        cy.contains('Transaction C').click();
        cy.contains('1 Span link');
        cy.getByTestSubj(
          `spanLinksBadge_${ids.producerConsumerIds.spanCId}`
        ).realHover();
        cy.contains('1 Span link found');
        cy.contains('1 incoming');
        cy.contains('0 outgoing');
      });

      it('Shows two parents and one children on consumer-multiple Transaction D', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'consumer-multiple' })
        );
        cy.contains('Transaction D').click();
        cy.contains('2 Span links');
        cy.getByTestSubj(
          `spanLinksBadge_${ids.producerMultipleIds.transactionDId}`
        ).realHover();
        cy.contains('2 Span links found');
        cy.contains('0 incoming');
        cy.contains('2 outgoing');
      });

      it('Shows two parents and one children on consumer-multiple Span E', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'consumer-multiple' })
        );
        cy.contains('Transaction D').click();
        cy.contains('2 Span links');
        cy.getByTestSubj(
          `spanLinksBadge_${ids.producerMultipleIds.spanEId}`
        ).realHover();
        cy.contains('2 Span links found');
        cy.contains('0 incoming');
        cy.contains('2 outgoing');
      });
    });

    describe('span link flyout', () => {
      it('Shows children details on producer-internal-only Span A', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'producer-internal-only' })
        );
        cy.contains('Transaction A').click();
        cy.contains('Span A').click();
        cy.getByTestSubj('spanLinksTab').click();
        cy.contains('producer-consumer')
          .should('have.attr', 'href')
          .and('include', '/services/producer-consumer/overview');
        cy.contains('Transaction C')
          .should('have.attr', 'href')
          .and(
            'include',
            `/link-to/transaction/${ids.producerConsumerIds.transactionCId}?waterfallItemId=${ids.producerConsumerIds.transactionCId}`
          );
        cy.contains('consumer-multiple')
          .should('have.attr', 'href')
          .and('include', '/services/consumer-multiple/overview');
        cy.contains('Transaction D')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.producerMultipleIds.transactionDId}?waterfallItemId=${ids.producerMultipleIds.transactionDId}`
          );
        cy.getByTestSubj('spanLinkTypeSelect').should(
          'contain.text',
          'Outgoing links (0)'
        );
      });

      it('Shows children and parents details on producer-external-only Span B', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'producer-external-only' })
        );
        cy.contains('Transaction B').click();
        cy.contains('Span B').click();
        cy.getByTestSubj('spanLinksTab').click();

        cy.contains('consumer-multiple')
          .should('have.attr', 'href')
          .and('include', '/services/consumer-multiple/overview');
        cy.contains('Span E')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.producerMultipleIds.transactionDId}?waterfallItemId=${ids.producerMultipleIds.spanEId}`
          );
        cy.getByTestSubj('spanLinkTypeSelect').select('Outgoing links (1)');
        cy.contains('Unknown');
        cy.contains('trace#1-span#1');
      });

      it('Shows children and parents details on producer-consumer Transaction C', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'producer-consumer' })
        );
        cy.contains('Transaction C').click();
        cy.get(
          `[aria-controls="${ids.producerConsumerIds.transactionCId}"]`
        ).click();
        cy.getByTestSubj('spanLinksTab').click();

        cy.contains('consumer-multiple')
          .should('have.attr', 'href')
          .and('include', '/services/consumer-multiple/overview');
        cy.contains('Span E')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.producerMultipleIds.transactionDId}?waterfallItemId=${ids.producerMultipleIds.spanEId}`
          );

        cy.getByTestSubj('spanLinkTypeSelect').select('Outgoing links (1)');
        cy.contains('producer-internal-only')
          .should('have.attr', 'href')
          .and('include', '/services/producer-internal-only/overview');
        cy.contains('Span A')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.producerInternalOnlyIds.transactionAId}?waterfallItemId=${ids.producerInternalOnlyIds.spanAId}`
          );
      });

      it('Shows children and parents details on producer-consumer Span C', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'producer-consumer' })
        );
        cy.contains('Transaction C').click();
        cy.contains('Span C').click();
        cy.getByTestSubj('spanLinksTab').click();

        cy.contains('consumer-multiple')
          .should('have.attr', 'href')
          .and('include', '/services/consumer-multiple/overview');
        cy.contains('Transaction D')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.producerMultipleIds.transactionDId}?waterfallItemId=${ids.producerMultipleIds.transactionDId}`
          );

        cy.getByTestSubj('spanLinkTypeSelect').should(
          'contain.text',
          'Outgoing links (0)'
        );
      });

      it('Shows children and parents details on consumer-multiple Transaction D', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'consumer-multiple' })
        );
        cy.contains('Transaction D').click();
        cy.get(
          `[aria-controls="${ids.producerMultipleIds.transactionDId}"]`
        ).click();
        cy.getByTestSubj('spanLinksTab').click();

        cy.contains('producer-consumer')
          .should('have.attr', 'href')
          .and('include', '/services/producer-consumer/overview');
        cy.contains('Span C')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.producerConsumerIds.transactionCId}?waterfallItemId=${ids.producerConsumerIds.spanCId}`
          );

        cy.contains('producer-internal-only')
          .should('have.attr', 'href')
          .and('include', '/services/producer-internal-only/overview');
        cy.contains('Span A')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.producerInternalOnlyIds.transactionAId}?waterfallItemId=${ids.producerInternalOnlyIds.spanAId}`
          );

        cy.getByTestSubj('spanLinkTypeSelect').should(
          'contain.text',
          'Incoming links (0)'
        );
      });

      it('Shows children and parents details on consumer-multiple Span E', () => {
        cy.visitKibana(
          getServiceInventoryUrl({ serviceName: 'consumer-multiple' })
        );
        cy.contains('Transaction D').click();
        cy.contains('Span E').click();
        cy.getByTestSubj('spanLinksTab').click();

        cy.contains('producer-external-only')
          .should('have.attr', 'href')
          .and('include', '/services/producer-external-only/overview');
        cy.contains('Span B')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.producerExternalOnlyIds.transactionBId}?waterfallItemId=${ids.producerExternalOnlyIds.spanBId}`
          );

        cy.contains('producer-consumer')
          .should('have.attr', 'href')
          .and('include', '/services/producer-consumer/overview');
        cy.contains('Transaction C')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.producerConsumerIds.transactionCId}?waterfallItemId=${ids.producerConsumerIds.transactionCId}`
          );

        cy.getByTestSubj('spanLinkTypeSelect').should(
          'contain.text',
          'Incoming links (0)'
        );
      });
    });
  });
});
