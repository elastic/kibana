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

function getTransactionDetailsPageUrl({
  serviceName,
  transactionName,
  waterfallItemId,
}: {
  serviceName: string;
  transactionName: string;
  waterfallItemId?: string;
}) {
  return url.format({
    pathname: `/app/apm/services/${serviceName}/transactions/view`,
    query: {
      rangeFrom: start,
      rangeTo: end,
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      serviceGroup: '',
      transactionName,
      transactionType: 'request',
      waterfallItemId,
    },
  });
}

describe('Span links', () => {
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  describe('when data is loaded', () => {
    before(async () => {
      await generateSpanLinksData({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      });
    });

    after(async () => {
      await synthtrace.clean();
    });

    describe('span links badge', () => {
      it('shows span links badge with incoming links only', () => {
        cy.visit(
          getTransactionDetailsPageUrl({
            serviceName: 'service-B',
            transactionName: 'GET /service_B',
          })
        );
        cy.contains('15 Span links');
        cy.get('[data-test-subj="spanLinksBadge"]').realHover();
        cy.contains('15 Span links found');
        cy.contains('15 incoming');
        cy.contains('0 outgoing');
      });

      it('shows span links badge with incoming and outgoing links only', () => {
        cy.visit(
          getTransactionDetailsPageUrl({
            serviceName: 'service-A',
            transactionName: 'GET /service_A',
          })
        );
        cy.contains('17 Span links');
        cy.get('[data-test-subj="spanLinksBadge"]').realHover();
        cy.contains('17 Span links found');
        cy.contains('2 incoming');
        cy.contains('15 outgoing');
      });
    });

    describe('span link flyout', () => {
      it('selects incoming links by default and no outgoing links are available', () => {
        cy.visit(
          getTransactionDetailsPageUrl({
            serviceName: 'service-B',
            transactionName: 'GET /service_B',
            waterfallItemId: '0000000000000062',
          })
        );
        cy.get('[data-test-subj="spanLinksTab"]').click();
        cy.get('[data-test-subj="spanLinkTypeSelect"]').should(
          'contain.text',
          'Incoming links (15)'
        );
        cy.get('[data-test-subj="spanLinkTypeSelect"]').should(
          'contain.text',
          'Outgoing links (0)'
        );
      });

      it('shows unknown service name for external links', () => {
        cy.visit(
          getTransactionDetailsPageUrl({
            serviceName: 'service-A',
            transactionName: 'GET /service_A',
            waterfallItemId: '0000000000000002',
          })
        );
        cy.get('[data-test-subj="spanLinksTab"]').click();
        cy.get('[data-test-subj="spanLinkTypeSelect"]').should(
          'contain.text',
          'Incoming links (2)'
        );
        cy.get('[data-test-subj="spanLinkTypeSelect"]').should(
          'contain.text',
          'Outgoing links (15)'
        );
        cy.contains('Unknown');
        cy.contains('N/A');
      });

      it('shows outgoing links', () => {
        cy.visit(
          getTransactionDetailsPageUrl({
            serviceName: 'service-A',
            transactionName: 'GET /service_A',
            waterfallItemId: '0000000000000002',
          })
        );
        cy.get('[data-test-subj="spanLinksTab"]').click();
        cy.get('[data-test-subj="spanLinkTypeSelect"]').should(
          'contain.text',
          'Incoming links (2)'
        );
        cy.get('[data-test-subj="spanLinkTypeSelect"]').select(
          'Outgoing links (15)'
        );
        cy.contains('service-B');
        cy.contains('get_service_B');
        cy.contains('900 ms');
      });
    });
  });
});
