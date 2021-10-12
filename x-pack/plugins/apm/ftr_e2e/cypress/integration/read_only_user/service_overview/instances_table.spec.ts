/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import archives_metadata from '../../../fixtures/es_archiver/archives_metadata';

const { start, end } = archives_metadata['apm_8.0.0'];

const serviceOverviewHref = url.format({
  pathname: '/app/apm/services/opbeans-java/overview',
  query: { rangeFrom: start, rangeTo: end },
});

const apisToIntercept = [
  {
    endpoint:
      '/api/apm/services/opbeans-java/service_overview_instances/main_statistics?*',
    name: 'instancesMainRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-java/service_overview_instances/detailed_statistics?*',
    name: 'instancesDetailsRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-java/service_overview_instances/details/31651f3c624b81c55dd4633df0b5b9f9ab06b151121b0404ae796632cd1f87ad?*',
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
    const serviceNodeName =
      '31651f3c624b81c55dd4633df0b5b9f9ab06b151121b0404ae796632cd1f87ad';

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
      ).realClick();
      cy.contains('Pod logs');
      cy.contains('Pod metrics');
      cy.contains('Container logs');
      cy.contains('Container metrics');
      cy.contains('Filter overview by instance');
      cy.contains('Metrics');
    });
  });
});
