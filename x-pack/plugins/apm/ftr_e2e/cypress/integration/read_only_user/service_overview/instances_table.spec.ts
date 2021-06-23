/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import archives_metadata from '../../../fixtures/es_archiver/archives_metadata';
import { esArchiverLoad, esArchiverUnload } from '../../../tasks/es_archiver';

const { start, end } = archives_metadata['apm_8.0.0'];

const serviceOverviewPath = '/app/apm/services/opbeans-java/overview';
const baseUrl = url.format({
  pathname: serviceOverviewPath,
  query: { rangeFrom: start, rangeTo: end },
});

const apisToIntercept = [
  {
    endpoint:
      '/api/apm/services/opbeans-java/service_overview_instances/main_statistics',
    as: 'instancesMainRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-java/service_overview_instances/detailed_statistics',
    as: 'instancesDetailsRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-java/service_overview_instances/details/02950c4c5fbb0fda1cc98c47bf4024b473a8a17629db6530d95dcee68bd54c6c',
    as: 'instanceDetailsRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-java/service_overview_instances/details/02950c4c5fbb0fda1cc98c47bf4024b473a8a17629db6530d95dcee68bd54c6c',
    as: 'instanceDetailsRequest',
  },
];

describe('Instances table', () => {
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });
  describe('when data is not loaded', () => {
    it('shows empty message', () => {
      cy.visit(baseUrl);
      cy.contains('opbeans-java');
      cy.get('[data-test-subj="serviceInstancesTableContainer"]').contains(
        'No items found'
      );
    });
  });

  describe('when data is loaded', () => {
    before(() => {
      esArchiverLoad('apm_8.0.0');
    });
    after(() => {
      esArchiverUnload('apm_8.0.0');
    });
    const serviceNodeName =
      '02950c4c5fbb0fda1cc98c47bf4024b473a8a17629db6530d95dcee68bd54c6c';
    it('has data in the table', () => {
      cy.visit(baseUrl);
      cy.contains('opbeans-java');
      cy.contains(serviceNodeName);
    });
    it('shows instance details', () => {
      apisToIntercept.map(({ endpoint, as }) => {
        cy.intercept('GET', endpoint).as(as);
      });

      cy.visit(baseUrl);
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
      apisToIntercept.map(({ endpoint, as }) => {
        cy.intercept('GET', endpoint).as(as);
      });

      cy.visit(baseUrl);
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
