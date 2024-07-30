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

    it('has no detectable a11y violations on load', () => {
      cy.contains('h1', 'Services');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
    });

    it('has a list of services', () => {
      cy.contains('opbeans-node');
      cy.contains('opbeans-java');
      cy.contains('opbeans-rum');
    });

    it('has a list of environments', () => {
      cy.get('td:contains(production)').should('have.length', 3);
    });

    it('when clicking on a service it loads the service overview for that service', () => {
      cy.contains('opbeans-node').click({ force: true });
      cy.url().should('include', '/apm/services/opbeans-node/overview');
      cy.contains('h1', 'opbeans-node');
    });
  });

  describe('Calls APIs', () => {
    beforeEach(() => {
      cy.intercept('GET', '/internal/apm/services?*').as('servicesRequest');
      cy.intercept('POST', '/internal/apm/services/detailed_statistics?*').as(
        'detailedStatisticsRequest'
      );

      cy.loginAsViewerUser();
      cy.visitKibana(serviceInventoryHref);
    });

    it('with the correct environment when changing the environment', () => {
      cy.wait(mainAliasNames);

      cy.getByTestSubj('environmentFilter').type('{selectall}production');

      cy.contains('button', 'production').click();

      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: mainAliasNames,
        value: 'environment=production',
      });
    });

    it('when selecting a different time range and clicking the update button', () => {
      cy.wait(mainAliasNames);
      cy.getByTestSubj('apmServiceGroupsTourDismissButton').click();

      cy.selectAbsoluteTimeRange(
        moment(timeRange.rangeFrom).subtract(5, 'm').toISOString(),
        moment(timeRange.rangeTo).subtract(5, 'm').toISOString()
      );
      cy.contains('Update').click();
      cy.wait(mainAliasNames);
    });
  });

  describe('Table search', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
    });

    it('Toggles fast filter when clicking on link', () => {
      cy.visitKibana(serviceInventoryHref);
      cy.get('[data-test-subj="tableSearchInput"]').should('not.exist');
      cy.contains('Enable fast filter').click();
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
      cy.contains('Disable fast filter').click();
      cy.get('[data-test-subj="tableSearchInput"]').should('not.exist');
    });
  });

  describe('Table search with viewer user', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    it('Should not be able to turn it on', () => {
      cy.visitKibana(serviceInventoryHref);
      cy.get('[data-test-subj="tableSearchInput"]').should('not.exist');
      cy.get('[data-test-subj="apmLink"]').should('be.disabled');
    });
  });

  describe('Check detailed statistics API with multiple services', () => {
    before(() => {
      // clean previous data created
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
