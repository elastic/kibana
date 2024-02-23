/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../synthtrace';
import { checkA11y } from '../../support/commands';
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
    before(() => {
      synthtrace.clean();

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
      cy.visitKibana(javaServiceErrorsPageHref);
      cy.contains('Error occurrences');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
    });

    describe('when service has no errors', () => {
      it('shows empty message', () => {
        cy.visitKibana(nodeServiceErrorsPageHref);
        cy.contains('opbeans-node');
        cy.contains('No errors found');
      });
    });

    describe('when service has errors', () => {
      it('shows errors distribution chart', () => {
        cy.visitKibana(javaServiceErrorsPageHref);
        cy.contains('Error occurrences');
      });

      it('shows failed transaction rate chart', () => {
        cy.visitKibana(javaServiceErrorsPageHref);
        cy.contains('Failed transaction rate');
      });

      it('errors table is populated', () => {
        cy.visitKibana(javaServiceErrorsPageHref);
        cy.contains('Error 0');
      });

      it('clicking on an error in the list navigates to error detail page', () => {
        cy.visitKibana(javaServiceErrorsPageHref);
        cy.contains('a', 'Error 1').click();
        cy.contains('div', 'Error 1');
      });

      it('clicking on type adds a filter in the searchbar', () => {
        cy.visitKibana(javaServiceErrorsPageHref);
        cy.getByTestSubj('apmUnifiedSearchBar')
          .invoke('val')
          .should('be.empty');
        // `force: true` because Cypress says the element is 0x0
        cy.contains('exception 0').click({
          force: true,
        });
        cy.getByTestSubj('apmUnifiedSearchBar')
          .its('length')
          .should('be.gt', 0);
        cy.get('table')
          .find('td:contains("exception 0")')
          .should('have.length', 1);
      });

      it('sorts by ocurrences', () => {
        cy.visitKibana(javaServiceErrorsPageHref);
        cy.contains('span', 'Occurrences').click();
        cy.url().should('include', '&sortField=occurrences&sortDirection=asc');
      });

      it('sorts by latest occurrences', () => {
        cy.visitKibana(javaServiceErrorsPageHref);
        cy.contains('span', 'Last seen').click();
        cy.url().should('include', '&sortField=lastSeen&sortDirection=asc');
      });
    });
  });
});

describe('Check detailed statistics API with multiple errors', () => {
  before(() => {
    synthtrace.index(
      generateErrors({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
        errorCount: 50,
      })
    );
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  after(() => {
    synthtrace.clean();
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
    cy.visitKibana(`${javaServiceErrorsPageHref}&pageSize=10`);
    cy.wait('@errorsMainStatistics');
    cy.get('.euiPagination__list').children().should('have.length', 5);

    let requestedGroupIdsPage1: string[];

    cy.wait('@errorsDetailedStatistics').then((payload) => {
      cy.get('[data-test-subj="errorGroupId"]').each(($el, index) => {
        const displayedGroupId = $el.text();
        requestedGroupIdsPage1 = JSON.parse(payload.request.body.groupIds);

        const requestedGroupId = requestedGroupIdsPage1[index].slice(0, 5);
        expect(displayedGroupId).eq(requestedGroupId);

        expect(requestedGroupIdsPage1).to.have.length(10);
      });
    });
    cy.getByTestSubj('pagination-button-1').click();

    // expect that the requested groupIds on page 2 are different from page 1
    cy.wait('@errorsDetailedStatistics').then((payload) => {
      const requestedGroupIdsPage2 = JSON.parse(payload.request.body.groupIds);

      expect(requestedGroupIdsPage1[0]).not.eq(requestedGroupIdsPage2[0]);
      expect(requestedGroupIdsPage2).to.have.length(10);
    });
  });
});
