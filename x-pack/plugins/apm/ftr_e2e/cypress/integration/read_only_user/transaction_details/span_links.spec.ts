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
    cy.loginAsReadOnlyUser();
  });

  describe('when data is loaded', () => {
    let ids: Awaited<ReturnType<typeof generateSpanLinksData>>;
    before(async () => {
      ids = await generateSpanLinksData();
    });

    after(async () => {
      await synthtrace.clean();
    });

    describe('span links count on trace waterfall', () => {
      it('Shows two children and no parents on Service A Span A', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service A' }));
        cy.contains('Transaction A').click();
        cy.contains('2 Span links');
        cy.get(
          `[data-test-subj="spanLinksBadge_${ids.serviceAIds.spanAId}"]`
        ).realHover();
        cy.contains('2 Span links found');
        cy.contains('2 incoming');
        cy.contains('0 outgoing');
      });

      it('Shows one parent and one children on Service B Span B', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service B' }));
        cy.contains('Transaction B').click();
        cy.contains('2 Span links');
        cy.get(
          `[data-test-subj="spanLinksBadge_${ids.serviceBIds.spanBId}"]`
        ).realHover();
        cy.contains('2 Span links found');
        cy.contains('1 incoming');
        cy.contains('1 outgoing');
      });

      it('Shows one parent and one children on Service C Transaction C', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service C' }));
        cy.contains('Transaction C').click();
        cy.contains('2 Span links');
        cy.get(
          `[data-test-subj="spanLinksBadge_${ids.serviceCIds.transactionCId}"]`
        ).realHover();
        cy.contains('2 Span links found');
        cy.contains('1 incoming');
        cy.contains('1 outgoing');
      });

      it('Shows no parent and one children on Service C Span C', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service C' }));
        cy.contains('Transaction C').click();
        cy.contains('1 Span link');
        cy.get(
          `[data-test-subj="spanLinksBadge_${ids.serviceCIds.spanCId}"]`
        ).realHover();
        cy.contains('1 Span link found');
        cy.contains('1 incoming');
        cy.contains('0 outgoing');
      });

      it('Shows two parents and one children on Service D Transaction D', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service D' }));
        cy.contains('Transaction D').click();
        cy.contains('2 Span links');
        cy.get(
          `[data-test-subj="spanLinksBadge_${ids.serviceDIds.transactionDId}"]`
        ).realHover();
        cy.contains('2 Span links found');
        cy.contains('0 incoming');
        cy.contains('2 outgoing');
      });

      it('Shows two parents and one children on Service D Span E', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service D' }));
        cy.contains('Transaction D').click();
        cy.contains('2 Span links');
        cy.get(
          `[data-test-subj="spanLinksBadge_${ids.serviceDIds.spanEId}"]`
        ).realHover();
        cy.contains('2 Span links found');
        cy.contains('0 incoming');
        cy.contains('2 outgoing');
      });
    });

    describe('span link flyout', () => {
      it('Shows children details on Service A Span A', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service A' }));
        cy.contains('Transaction A').click();
        cy.contains('Span A').click();
        cy.get('[data-test-subj="spanLinksTab"]').click();
        cy.contains('Service C')
          .should('have.attr', 'href')
          .and('include', '/services/Service C/overview');
        cy.contains('Transaction C')
          .should('have.attr', 'href')
          .and(
            'include',
            `/link-to/transaction/${ids.serviceCIds.transactionCId}?waterfallItemId=${ids.serviceCIds.transactionCId}`
          );
        cy.contains('Service D')
          .should('have.attr', 'href')
          .and('include', '/services/Service D/overview');
        cy.contains('Transaction D')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.serviceDIds.transactionDId}?waterfallItemId=${ids.serviceDIds.transactionDId}`
          );
        cy.get('[data-test-subj="spanLinkTypeSelect"]').should(
          'contain.text',
          'Outgoing links (0)'
        );
      });

      it('Shows children and parents details on Service B Span B', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service B' }));
        cy.contains('Transaction B').click();
        cy.contains('Span B').click();
        cy.get('[data-test-subj="spanLinksTab"]').click();

        cy.contains('Service D')
          .should('have.attr', 'href')
          .and('include', '/services/Service D/overview');
        cy.contains('Span E')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.serviceDIds.transactionDId}?waterfallItemId=${ids.serviceDIds.spanEId}`
          );
        cy.get('[data-test-subj="spanLinkTypeSelect"]').select(
          'Outgoing links (1)'
        );
        cy.contains('Unknown');
        cy.contains('trace#1-span#1');
      });

      it('Shows children and parents details on Service C Transaction C', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service C' }));
        cy.contains('Transaction C').click();
        cy.get(`[aria-controls="${ids.serviceCIds.transactionCId}"]`).click();
        cy.get('[data-test-subj="spanLinksTab"]').click();

        cy.contains('Service D')
          .should('have.attr', 'href')
          .and('include', '/services/Service D/overview');
        cy.contains('Span E')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.serviceDIds.transactionDId}?waterfallItemId=${ids.serviceDIds.spanEId}`
          );

        cy.get('[data-test-subj="spanLinkTypeSelect"]').select(
          'Outgoing links (1)'
        );
        cy.contains('Service A')
          .should('have.attr', 'href')
          .and('include', '/services/Service A/overview');
        cy.contains('Span A')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.serviceAIds.transactionAId}?waterfallItemId=${ids.serviceAIds.spanAId}`
          );
      });

      it('Shows children and parents details on Service C Span C', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service C' }));
        cy.contains('Transaction C').click();
        cy.contains('Span C').click();
        cy.get('[data-test-subj="spanLinksTab"]').click();

        cy.contains('Service D')
          .should('have.attr', 'href')
          .and('include', '/services/Service D/overview');
        cy.contains('Transaction D')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.serviceDIds.transactionDId}?waterfallItemId=${ids.serviceDIds.transactionDId}`
          );

        cy.get('[data-test-subj="spanLinkTypeSelect"]').should(
          'contain.text',
          'Outgoing links (0)'
        );
      });

      it('Shows children and parents details on Service D Transaction D', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service D' }));
        cy.contains('Transaction D').click();
        cy.get(`[aria-controls="${ids.serviceDIds.transactionDId}"]`).click();
        cy.get('[data-test-subj="spanLinksTab"]').click();

        cy.contains('Service C')
          .should('have.attr', 'href')
          .and('include', '/services/Service C/overview');
        cy.contains('Span C')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.serviceCIds.transactionCId}?waterfallItemId=${ids.serviceCIds.spanCId}`
          );

        cy.contains('Service A')
          .should('have.attr', 'href')
          .and('include', '/services/Service A/overview');
        cy.contains('Span A')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.serviceAIds.transactionAId}?waterfallItemId=${ids.serviceAIds.spanAId}`
          );

        cy.get('[data-test-subj="spanLinkTypeSelect"]').should(
          'contain.text',
          'Incoming links (0)'
        );
      });

      it('Shows children and parents details on Service D Span E', () => {
        cy.visit(getServiceInventoryUrl({ serviceName: 'Service D' }));
        cy.contains('Transaction D').click();
        cy.contains('Span E').click();
        cy.get('[data-test-subj="spanLinksTab"]').click();

        cy.contains('Service B')
          .should('have.attr', 'href')
          .and('include', '/services/Service B/overview');
        cy.contains('Span B')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.serviceBIds.transactionBId}?waterfallItemId=${ids.serviceBIds.spanBId}`
          );

        cy.contains('Service C')
          .should('have.attr', 'href')
          .and('include', '/services/Service C/overview');
        cy.contains('Transaction C')
          .should('have.attr', 'href')
          .and(
            'include',
            `link-to/transaction/${ids.serviceCIds.transactionCId}?waterfallItemId=${ids.serviceCIds.transactionCId}`
          );

        cy.get('[data-test-subj="spanLinkTypeSelect"]').should(
          'contain.text',
          'Incoming links (0)'
        );
      });
    });
  });
});
