/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { checkA11y } from '../../../support/commands';
import { generateData, generateErrors } from './generate_data';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const javaServiceErrorsPageHref = url.format({
  pathname: '/app/apm/services/opbeans-java/errors',
  query: { rangeFrom: start, rangeTo: end },
});

const nodeServiceErrorsPageHref = url.format({
  pathname: '/app/apm/services/opbeans-node/errors',
  query: { rangeFrom: start, rangeTo: end },
});

describe('Errors page', () => {
  beforeEach(() => {
    cy.loginAsViewerUser();
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
      cy.visit(javaServiceErrorsPageHref);
      cy.contains('Error occurrences');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
    });

    describe('when service has no errors', () => {
      it('shows empty message', () => {
        cy.visit(nodeServiceErrorsPageHref);
        cy.contains('opbeans-node');
        cy.contains('No errors found');
      });
    });

    describe('when service has errors', () => {
      it('shows errors distribution chart', () => {
        cy.visit(javaServiceErrorsPageHref);
        cy.contains('Error occurrences');
      });

      it('shows failed transaction rate chart', () => {
        cy.visit(javaServiceErrorsPageHref);
        cy.contains('Failed transaction rate');
      });

      it('errors table is populated', () => {
        cy.visit(javaServiceErrorsPageHref);
        cy.contains('Error 0');
      });

      it('clicking on an error in the list navigates to error detail page', () => {
        cy.visit(javaServiceErrorsPageHref);
        cy.contains('a', 'Error 1').click();
        cy.contains('div', 'Error 1');
      });

      it('clicking on type adds a filter in the kuerybar', () => {
        cy.visit(javaServiceErrorsPageHref);
        cy.get('[data-test-subj="headerFilterKuerybar"]')
          .invoke('val')
          .should('be.empty');
        // `force: true` because Cypress says the element is 0x0
        cy.contains('exception 0').click({
          force: true,
        });
        cy.get('[data-test-subj="headerFilterKuerybar"]')
          .its('length')
          .should('be.gt', 0);
        cy.get('table')
          .find('td:contains("exception 0")')
          .should('have.length', 1);
      });

      it('sorts by ocurrences', () => {
        cy.visit(javaServiceErrorsPageHref);
        cy.contains('span', 'Occurrences').click();
        cy.url().should('include', '&sortField=occurrences&sortDirection=asc');
      });

      it('sorts by latest occurrences', () => {
        cy.visit(javaServiceErrorsPageHref);
        cy.contains('span', 'Last seen').click();
        cy.url().should('include', '&sortField=lastSeen&sortDirection=asc');
      });
    });
  });
});

describe('Check detailed statistics API with multiple errors', () => {
  before(async () => {
    cy.loginAsViewerUser();
    await synthtrace.index(
      generateErrors({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
        errorCount: 50,
      })
    );
  });

  after(async () => {
    await synthtrace.clean();
  });

  it('calls detailed API with visible items only', () => {
    cy.intercept(
      'GET',
      '/internal/apm/services/opbeans-java/errors/groups/main_statistics?*'
    ).as('errorsMainStatistics');
    cy.intercept(
      'POST',
      '/internal/apm/services/opbeans-java/errors/groups/detailed_statistics?*'
    ).as('errorsDetailedStatistics');
    cy.visit(`${javaServiceErrorsPageHref}&pageSize=10`);
    cy.wait('@errorsMainStatistics');
    cy.get('.euiPagination__list').children().should('have.length', 5);
    cy.wait('@errorsDetailedStatistics').then((payload) => {
      expect(payload.request.body.groupIds).eql(
        JSON.stringify([
          '0000000000000000000000000Error 0',
          '0000000000000000000000000Error 1',
          '0000000000000000000000000Error 2',
          '0000000000000000000000000Error 3',
          '0000000000000000000000000Error 4',
          '0000000000000000000000000Error 5',
          '0000000000000000000000000Error 6',
          '0000000000000000000000000Error 7',
          '0000000000000000000000000Error 8',
          '0000000000000000000000000Error 9',
        ])
      );
    });
    cy.get('[data-test-subj="pagination-button-1"]').click();
    cy.wait('@errorsDetailedStatistics').then((payload) => {
      expect(payload.request.body.groupIds).eql(
        JSON.stringify([
          '000000000000000000000000Error 10',
          '000000000000000000000000Error 11',
          '000000000000000000000000Error 12',
          '000000000000000000000000Error 13',
          '000000000000000000000000Error 14',
          '000000000000000000000000Error 15',
          '000000000000000000000000Error 16',
          '000000000000000000000000Error 17',
          '000000000000000000000000Error 18',
          '000000000000000000000000Error 19',
        ])
      );
    });
  });
});
