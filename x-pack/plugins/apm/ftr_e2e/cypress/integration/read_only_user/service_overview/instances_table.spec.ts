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

const serviceOverviewHref = url.format({
  pathname: '/app/apm/services/opbeans-java/overview',
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
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  // describe('when data is not loaded', () => {
  //   it('shows empty message', () => {
  //     cy.visit(serviceOverviewHref);
  //     cy.contains('opbeans-java');
  //     cy.get('[data-test-subj="serviceInstancesTableContainer"]').contains(
  //       'No items found'
  //     );
  //   });
  // });

  describe('when data is loaded', () => {
    before(async () => {
      await synthtrace.index(
        opbeans({
          from: new Date(start).getTime(),
          to: new Date(end).getTime(),
        })
      );
    });

    after(async () => {
      await synthtrace.clean();
    });

    it('has data in the table', () => {
      cy.visit(serviceOverviewHref);
      cy.contains('opbeans-java');
      cy.contains(serviceNodeName);
    });
    it('shows instance details', () => {
      apisToIntercept.map(({ endpoint, name }) => {
        cy.intercept('GET', endpoint).as(name);
      });

      cy.visit(serviceOverviewHref);
      cy.contains('opbeans-java');

      cy.wait('@instancesMainRequest');
      cy.contains(serviceNodeName);

      cy.wait('@instancesDetailsRequest');
      cy.get(
        `[data-test-subj="instanceDetailsButton_${serviceNodeName}"]`
      ).realClick();
      cy.get('[data-test-subj="loadingSpinner"]').should('be.visible');
      cy.wait('@instanceDetailsRequest').then(() => {
        cy.contains('Service');
      });
    });
    it('shows actions available', () => {
      apisToIntercept.map(({ endpoint, name }) => {
        cy.intercept('GET', endpoint).as(name);
      });

      cy.visit(serviceOverviewHref);
      cy.contains('opbeans-java');

      cy.wait('@instancesMainRequest');
      cy.contains(serviceNodeName);

      cy.wait('@instancesDetailsRequest');
      cy.get(
        `[data-test-subj="instanceActionsButton_${serviceNodeName}"]`
      ).click();
      cy.contains('Pod logs');
      cy.contains('Pod metrics');
      cy.contains('Container logs');
      cy.contains('Container metrics');
      cy.contains('Filter overview by instance');
      cy.contains('Metrics');
    });
  });
});
