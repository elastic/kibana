/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const timeRange = {
  rangeFrom: '2021-10-10T00:00:00.000Z',
  rangeTo: '2021-10-10T00:15:00.000Z',
};

const serviceInventoryHref = url.format({
  pathname: '/app/apm/services',
  query: timeRange,
});

const apiRequestsToIntercept = [
  {
    endpoint: '/internal/apm/services?*',
    aliasName: 'servicesRequest',
  },
  {
    endpoint: '/internal/apm/services/detailed_statistics?*',
    aliasName: 'detailedStatisticsRequest',
  },
];

const aliasNames = apiRequestsToIntercept.map(
  ({ aliasName }) => `@${aliasName}`
);

describe('When navigating to the service inventory', () => {
  before(async () => {
    const { rangeFrom, rangeTo } = timeRange;
    await synthtrace.index(
      opbeans({
        from: new Date(rangeFrom).getTime(),
        to: new Date(rangeTo).getTime(),
      })
    );
  });

  after(async () => {
    await synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsReadOnlyUser();
    cy.visit(serviceInventoryHref);
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

  describe('Calls APIs', () => {
    beforeEach(() => {
      apiRequestsToIntercept.map(({ endpoint, aliasName }) => {
        cy.intercept('GET', endpoint).as(aliasName);
      });
    });

    it('with the correct environment when changing the environment', () => {
      cy.wait(aliasNames);

      cy.get('[data-test-subj="environmentFilter"]').select('production');

      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: aliasNames,
        value: 'environment=production',
      });
    });

    it('when clicking the refresh button', () => {
      cy.wait(aliasNames);
      cy.contains('Refresh').click();
      cy.wait(aliasNames);
    });

    it.skip('when selecting a different time range and clicking the update button', () => {
      cy.wait(aliasNames);

      cy.selectAbsoluteTimeRange(
        'Oct 10, 2021 @ 01:00:00.000',
        'Oct 10, 2021 @ 01:30:00.000'
      );
      cy.contains('Update').click();
      cy.wait(aliasNames);

      cy.contains('Refresh').click();
      cy.wait(aliasNames);
    });
  });
});
