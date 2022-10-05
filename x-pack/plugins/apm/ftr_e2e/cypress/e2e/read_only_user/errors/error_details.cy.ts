/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { checkA11y } from '../../../support/commands';
import { generateData } from './generate_data';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';
const errorDetailsPageHref = url.format({
  pathname:
    '/app/apm/services/opbeans-java/errors/0000000000000000000000000Error%200',
  query: {
    rangeFrom: start,
    rangeTo: end,
  },
});

describe('Error details', () => {
  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  describe('when data is loaded', () => {
    before(() => {
      synthtrace.index(
        generateData({
          from: new Date(start).getTime(),
          to: new Date(end).getTime(),
        })
      );
    });

    after(() => {
      synthtrace.clean();
    });

    it('has no detectable a11y violations on load', () => {
      cy.visitKibana(errorDetailsPageHref);
      cy.contains('Error group 00000');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
    });

    describe('when error has no occurrences', () => {
      it('shows an empty message', () => {
        cy.visitKibana(
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

    describe('when error has data', () => {
      it('shows errors distribution chart', () => {
        cy.visitKibana(errorDetailsPageHref);
        cy.contains('Error group 00000');
        cy.getByTestSubj('errorDistribution').contains('Occurrences');
      });

      it('shows top erroneous transactions table', () => {
        cy.visitKibana(errorDetailsPageHref);
        cy.contains('Top 5 affected transactions');
        cy.getByTestSubj('topErroneousTransactionsTable')
          .contains('a', 'GET /apple 🍎')
          .click();
        cy.url().should('include', 'opbeans-java/transactions/view');
      });

      it('shows a Stacktrace and Metadata tabs', () => {
        cy.visitKibana(errorDetailsPageHref);
        cy.contains('button', 'Exception stack trace');
        cy.contains('button', 'Metadata');
      });

      describe('when clicking on related transaction sample', () => {
        it('should redirects to the transaction details page', () => {
          cy.visitKibana(errorDetailsPageHref);
          cy.contains('Error group 00000');
          cy.contains('a', 'GET /apple 🍎').click();
          cy.url().should('include', 'opbeans-java/transactions/view');
        });
      });

      describe('when clicking on View x occurences in discover', () => {
        it('should redirects the user to discover', () => {
          cy.visitKibana(errorDetailsPageHref);
          cy.contains('View 1 occurrence in Discover').click();
          cy.url().should('include', 'app/discover');
        });
      });
    });
  });
});
