/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceJavaOverviewHref = url.format({
  pathname: '/app/apm/services/opbeans-java/overview',
  query: { rangeFrom: start, rangeTo: end },
});

const serviceRumOverviewHref = url.format({
  pathname: '/app/apm/services/opbeans-rum/overview',
  query: { rangeFrom: start, rangeTo: end },
});

const testServiveHref = url.format({
  pathname: '/app/apm/services/test-service/overview',
  query: { rangeFrom: start, rangeTo: end },
});

const serviceNodeName = 'opbeans-java-prod-1';

const apisToIntercept = [
  {
    endpoint:
      '/internal/apm/services/opbeans-java/service_overview_instances/main_statistics?*',
    name: 'instancesMainRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-java/service_overview_instances/detailed_statistics?*',
    name: 'instancesDetailsRequest',
  },
  {
    endpoint: `/internal/apm/services/opbeans-java/service_overview_instances/details/${serviceNodeName}?*`,
    name: 'instanceDetailsRequest',
  },
];

describe('Instances table', () => {
  before(() => {
    synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  describe('when there is no data', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });
    it('shows empty message', () => {
      cy.visitKibana(testServiveHref);
      cy.contains('test-service');
      cy.getByTestSubj('serviceInstancesTableContainer').contains(
        'No instances found'
      );
    });
  });

  describe('when is RUM service', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    it('hides instances table', () => {
      cy.visitKibana(serviceRumOverviewHref);
      cy.contains('opbeans-rum');
      cy.getByTestSubj('serviceInstancesTableContainer').should('not.exist');
    });
  });

  describe('when data is loaded', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    after(() => {
      synthtrace.clean();
    });

    it('has data in the table', () => {
      cy.visitKibana(serviceJavaOverviewHref);
      cy.contains('opbeans-java');
      cy.contains(serviceNodeName);
    });
    it('shows instance details', () => {
      apisToIntercept.map(({ endpoint, name }) => {
        cy.intercept('GET', endpoint).as(name);
      });

      cy.visitKibana(serviceJavaOverviewHref);
      cy.contains('opbeans-java');

      cy.wait('@instancesMainRequest');
      cy.contains(serviceNodeName);

      cy.wait('@instancesDetailsRequest');
      cy.getByTestSubj(`instanceDetailsButton_${serviceNodeName}`).realClick();
      cy.getByTestSubj('loadingSpinner').should('be.visible');
      cy.wait('@instanceDetailsRequest').then(() => {
        cy.contains('Service');
      });
    });

    it('shows actions available', () => {
      apisToIntercept.map(({ endpoint, name }) => {
        cy.intercept('GET', endpoint).as(name);
      });

      cy.visitKibana(serviceJavaOverviewHref);
      cy.contains('opbeans-java');

      cy.wait('@instancesMainRequest');
      cy.contains(serviceNodeName);

      cy.wait('@instancesDetailsRequest');
      cy.getByTestSubj(`instanceActionsButton_${serviceNodeName}`).click();
      cy.contains('Pod logs');
      cy.contains('Pod metrics');
      // cy.contains('Container logs');
      // cy.contains('Container metrics');
      cy.contains('Filter overview by instance');
      cy.contains('Metrics');
    });
  });
});
