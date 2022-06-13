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

    it('has no detectable a11y violations on load', () => {
      cy.visit(errorDetailsPageHref);
      cy.contains('Error group 00000');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
    });

    describe('when error has no occurrences', () => {
      it('shows an empty message', () => {
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

    describe('when error has data', () => {
      it('shows errors distribution chart', () => {
        cy.visit(errorDetailsPageHref);
        cy.contains('Error group 00000');
        cy.get('[data-test-subj="errorDistribution"]').contains('Occurrences');
      });

      it('shows a Stacktrace and Metadata tabs', () => {
        cy.visit(errorDetailsPageHref);
        cy.contains('button', 'Exception stack trace');
        cy.contains('button', 'Metadata');
      });

      describe('when clicking on related transaction sample', () => {
        it('should redirects to the transaction details page', () => {
          cy.visit(errorDetailsPageHref);
          cy.contains('Error group 00000');
          cy.contains('a', 'GET /apple 🍎').click();
          cy.url().should('include', 'opbeans-java/transactions/view');
        });
      });

      describe('when clicking on View x occurences in discover', () => {
        it('should redirects the user to discover', () => {
          cy.visit(errorDetailsPageHref);
          cy.contains('View 1 occurrence in Discover.').click();
          cy.url().should('include', 'app/discover');
        });
      });
    });
  });
});
