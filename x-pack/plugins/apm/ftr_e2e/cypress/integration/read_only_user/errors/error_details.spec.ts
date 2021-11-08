/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { generateData } from './generate_data';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';
const errorDetailsPageHref = url.format({
  pathname:
    '/app/apm/services/opbeans-java/errors/0000000000000000000000000Error%201',
  query: {
    rangeFrom: start,
    rangeTo: end,
  },
});

describe('Error details', () => {
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  describe('when data is loaded', () => {
    before(async () => {
      await synthtrace.index(
        generateData({
          from: new Date(start).getTime(),
          to: new Date(end).getTime(),
        })
      );
    });

    after(async () => {
      await synthtrace.clean();
    });

    describe('No data', () => {
      it('shows empty message', () => {
        cy.visit(
          url.format({
            pathname:
              '/app/apm/services/opbeans-java/errors/0000000000000000000000000Error%201',
            query: {
              rangeFrom: start,
              rangeTo: end,
              kuery: 'service.name: "opbeans-node"',
            },
          })
        );
        cy.contains('No data to display');
      });
    });

    describe('when service has errors', () => {
      // ///!!!!!!!!! Change describe
      it('shows errors distribution chart', () => {
        cy.visit(errorDetailsPageHref);
        cy.contains('Error group 00000');
        cy.get('[data-test-subj="errorDistribution"]').contains('Occurrences');
      });

      it('click on related transaction sample redirects to the transaction details page', () => {
        cy.visit(errorDetailsPageHref);
        cy.contains('Error group 00000');
        cy.contains('a', 'GET /apple 🍎').click();
        cy.url().should('include', 'opbeans-java/transactions/view');
      });

      it('shows a stacktrace and metadata tabs', () => {
        cy.visit(errorDetailsPageHref);
        cy.contains('button', 'Exception stack trace');
        cy.contains('button', 'Metadata');
      });

      it('click on View X occurrences in discover redirect the user to discover', () => {
        cy.visit(errorDetailsPageHref);
        cy.contains('span', 'Discover').click();
        cy.url().should('include', 'app/discover');
      });
    });
  });
});
