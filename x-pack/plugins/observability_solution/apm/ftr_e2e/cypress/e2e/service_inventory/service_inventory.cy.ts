/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import url from 'url';
import { synthtrace } from '../../../synthtrace';
import { opbeans } from '../../fixtures/synthtrace/opbeans';
import { checkA11y } from '../../support/commands';
import { generateMultipleServicesData } from './generate_data';

const timeRange = {
  rangeFrom: '2021-10-10T00:00:00.000Z',
  rangeTo: '2021-10-10T00:15:00.000Z',
};

const serviceInventoryHref = url.format({
  pathname: '/app/apm/services',
  query: timeRange,
});

const mainApiRequestsToIntercept = [
  {
    endpoint: '/internal/apm/services?*',
    aliasName: 'servicesRequest',
  },
  {
    endpoint: '/internal/apm/services/detailed_statistics?*',
    aliasName: 'detailedStatisticsRequest',
  },
];

const mainAliasNames = mainApiRequestsToIntercept.map(({ aliasName }) => `@${aliasName}`);

describe('Service inventory', () => {
  before(() => {
    const { rangeFrom, rangeTo } = timeRange;
    synthtrace.index(
      opbeans({
        from: new Date(rangeFrom).getTime(),
        to: new Date(rangeTo).getTime(),
      })
    );
  });
  after(() => {
    synthtrace.clean();
  });

  describe('When navigating to the service inventory', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana(serviceInventoryHref);
    });

    it('renders correctly', () => {
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
      cy.intercept('GET', '/internal/apm/services?*').as('servicesRequest');
      cy.intercept('POST', '/internal/apm/services/detailed_statistics?*').as(
        'detailedStatisticsRequest'
      );
      cy.intercept('GET', '/internal/apm/suggestions?*').as('environmentSuggestionsRequest');
      cy.wait('@environmentSuggestionsRequest');
      cy.wait(mainAliasNames);

      // It checks page title
      cy.contains('h1', 'Services');

      // It checks inventory table
      cy.contains('opbeans-node');
      cy.contains('opbeans-java');
      cy.contains('opbeans-rum');
      cy.get('td:contains(production)').should('have.length', 3);

      // It changes environment to production
      cy.getByTestSubj('environmentFilter').type('{selectall}production');
      cy.contains('button', 'production').click();
      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: mainAliasNames,
        value: 'environment=production',
      });

      // It changes date range
      const from = moment(timeRange.rangeFrom).subtract(5, 'm').toISOString();
      const to = moment(timeRange.rangeTo).subtract(5, 'm').toISOString();
      cy.selectAbsoluteTimeRange(from, to);
      cy.contains('Update').click();
      cy.wait(mainAliasNames);

      // It filter table content with Fast filter
      cy.get('[data-test-subj="tableSearchInput"]').should('exist');
      cy.contains('opbeans-node');
      cy.contains('opbeans-java');
      cy.contains('opbeans-rum');
      cy.get('[data-test-subj="tableSearchInput"]').type('java');
      cy.contains('opbeans-node').should('not.exist');
      cy.contains('opbeans-java');
      cy.contains('opbeans-rum').should('not.exist');
      cy.get('[data-test-subj="tableSearchInput"]').clear();
      cy.contains('opbeans-node');
      cy.contains('opbeans-java');
      cy.contains('opbeans-rum');

      // It navigates to service overview page
      cy.get('[data-test-subj="serviceLink_nodejs"]').click();
      cy.url().should('include', '/apm/services/opbeans-node/overview');
      cy.contains('h1', 'opbeans-node');
      cy.go('back');

      // It navigates to Inventory plugin.
      cy.contains('Try our new Inventory').click();
      cy.url().should('include', '/inventory');
    });
  });

  describe('Check detailed statistics API with multiple services', () => {
    before(() => {
      synthtrace.clean();
      const { rangeFrom, rangeTo } = timeRange;
      synthtrace.index(
        generateMultipleServicesData({
          from: new Date(rangeFrom).getTime(),
          to: new Date(rangeTo).getTime(),
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
      cy.intercept('POST', '/internal/apm/services/detailed_statistics?*').as(
        'detailedStatisticsRequest'
      );
      cy.intercept('GET', '/internal/apm/services?*').as('mainStatisticsRequest');

      cy.visitKibana(`${serviceInventoryHref}&pageSize=10&sortField=serviceName&sortDirection=asc`);
      cy.wait('@mainStatisticsRequest');
      cy.contains('Services');
      cy.get('.euiPagination__list').children().should('have.length', 5);
      cy.wait('@detailedStatisticsRequest').then((payload) => {
        expect(payload.request.body.serviceNames).eql(
          JSON.stringify(['0', '1', '10', '11', '12', '13', '14', '15', '16', '17'])
        );
      });
      cy.getByTestSubj('pagination-button-1').click();
      cy.wait('@detailedStatisticsRequest').then((payload) => {
        expect(payload.request.body.serviceNames).eql(
          JSON.stringify(['18', '19', '2', '20', '21', '22', '23', '24', '25', '26'])
        );
      });
    });
  });
});
