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

const timeRange = {
  rangeFrom: '2021-10-10T00:00:00.000Z',
  rangeTo: '2021-10-10T00:15:00.000Z',
};

const storageExplorerHref = url.format({
  pathname: '/app/apm/storage-explorer',
  query: timeRange,
});

const mainApiRequestsToIntercept = [
  {
    endpoint: '/internal/apm/storage_chart',
    aliasName: 'storageChartRequest',
  },
  {
    endpoint: '/internal/apm/storage_explorer_summary_stats',
    aliasName: 'summaryStatsRequest',
  },
  {
    endpoint: '/internal/apm/storage_explorer',
    aliasName: 'storageExlorerRequest',
  },
];

const mainAliasNames = mainApiRequestsToIntercept.map(({ aliasName }) => `@${aliasName}`);

// See details: https://github.com/elastic/kibana/issues/191961
describe.skip('Storage Explorer', () => {
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

  describe('When navigating to storage explorer without the required permissions', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana(storageExplorerHref);
    });

    it('displays a prompt for permissions', () => {
      cy.contains('You need permission');
    });
  });

  describe('When navigating to storage explorer with the required permissions', () => {
    beforeEach(() => {
      cy.loginAsMonitorUser();
      cy.visitKibana(storageExplorerHref);
    });

    it('has no detectable a11y violations on load', () => {
      cy.contains('h1', 'Storage Explorer');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
    });

    it('has a list of summary stats', () => {
      cy.contains('Total APM size');
      cy.contains('Relative disk space used');
      cy.contains('Delta in APM size');
      cy.contains('Daily data generation');
      cy.contains('Traces per minute');
      cy.contains('Number of services');
    });

    it('renders the storage timeseries chart', () => {
      cy.getByTestSubj('storageExplorerTimeseriesChart');
    });

    it('has a list of services and environments', () => {
      cy.contains('[data-test-subj="apmStorageExplorerServiceLink"]', 'opbeans-node');
      cy.contains('[data-test-subj="apmStorageExplorerServiceLink"]', 'opbeans-java');
      cy.contains('[data-test-subj="apmStorageExplorerServiceLink"]', 'opbeans-rum');
      cy.get('td:contains(production)').should('have.length', 3);
    });

    it('when clicking on a service it loads the service overview for that service', () => {
      cy.contains('[data-test-subj="apmStorageExplorerServiceLink"]', 'opbeans-node').click();

      cy.url().should('include', '/apm/services/opbeans-node/overview');
      cy.contains('h1', 'opbeans-node');
    });
  });

  describe('Calls APIs', () => {
    beforeEach(() => {
      mainApiRequestsToIntercept.forEach(({ endpoint, aliasName }) => {
        cy.intercept({ pathname: endpoint }).as(aliasName);
      });

      cy.loginAsMonitorUser();
      cy.visitKibana(storageExplorerHref);
    });

    it('with the correct environment when changing the environment', () => {
      cy.wait(mainAliasNames);

      cy.getByTestSubj('environmentFilter').type('{selectall}production');

      cy.contains('button', 'production').click({ force: true });

      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: mainAliasNames,
        value: 'environment=production',
      });
    });

    it('when selecting a different time range and clicking the update button', () => {
      cy.wait(mainAliasNames);

      cy.selectAbsoluteTimeRange(
        moment(timeRange.rangeFrom).subtract(5, 'm').toISOString(),
        moment(timeRange.rangeTo).subtract(5, 'm').toISOString()
      );
      cy.contains('Update').click();
      cy.wait(mainAliasNames);
    });

    it('with the correct lifecycle phase when changing the lifecycle phase', () => {
      cy.wait(mainAliasNames);

      cy.getByTestSubj('storageExplorerLifecyclePhaseSelect').click();
      cy.contains('button', 'Warm').click();

      cy.expectAPIsToHaveBeenCalledWith({
        apisIntercepted: mainAliasNames,
        value: 'indexLifecyclePhase=warm',
      });
    });
  });

  describe('Storage details per service', () => {
    beforeEach(() => {
      const apiRequestsToIntercept = [
        ...mainApiRequestsToIntercept,
        {
          endpoint: '/internal/apm/services/opbeans-node/storage_details',
          aliasName: 'storageDetailsRequest',
        },
      ];

      apiRequestsToIntercept.forEach(({ endpoint, aliasName }) => {
        cy.intercept({ pathname: endpoint }).as(aliasName);
      });

      cy.loginAsMonitorUser();
      cy.visitKibana(storageExplorerHref);
    });

    it('shows storage details', () => {
      cy.wait(mainAliasNames);
      cy.contains('opbeans-node');

      cy.getByTestSubj('storageDetailsButton_opbeans-node').click();
      cy.wait('@storageDetailsRequest');

      cy.contains('Service storage details');
      cy.getByTestSubj('storageExplorerTimeseriesChart');
      cy.getByTestSubj('serviceStorageDetailsTable');
      cy.getByTestSubj('storageExplorerIndicesStatsTable');
    });
  });
});
