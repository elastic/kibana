/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import { synthtrace } from '../../../synthtrace';
import { opbeans } from '../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:01:00.000Z';

const serviceMapHref = url.format({
  pathname: '/app/apm/service-map',
  query: {
    environment: 'ENVIRONMENT_ALL',
    rangeFrom: start,
    rangeTo: end,
  },
});

const detailedServiceMap = url.format({
  pathname: '/app/apm/services/opbeans-java/service-map',
  query: {
    environment: 'ENVIRONMENT_ALL',
    rangeFrom: start,
    rangeTo: end,
  },
});

// Flaky: https://github.com/elastic/kibana/issues/207005
describe.skip('service map', () => {
  before(() => {
    synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  describe('when navigating to service map', () => {
    beforeEach(() => {
      cy.intercept('GET', '/internal/apm/service-map?*').as('serviceMap');
    });

    it('shows nodes in service map', () => {
      cy.visitKibana(serviceMapHref);
      cy.wait('@serviceMap');

      prepareCanvasForScreenshot();

      cy.withHidden('[data-test-subj="headerGlobalNav"]', () =>
        cy.getByTestSubj('serviceMap').matchImage({
          imagesPath: '{spec_path}/snapshots',
          title: 'service_map',
          matchAgainstPath: 'cypress/e2e/service_map/snapshots/service_map.png',
          maxDiffThreshold: 0.02, // maximum threshold above which the test should fail
        })
      );
    });

    it('shows nodes in detailed service map', () => {
      cy.visitKibana(detailedServiceMap);
      cy.wait('@serviceMap');
      cy.contains('h1', 'opbeans-java');

      prepareCanvasForScreenshot();

      cy.withHidden('[data-test-subj="headerGlobalNav"]', () =>
        cy.getByTestSubj('serviceMap').matchImage({
          imagesPath: '{spec_path}/snapshots',
          title: 'detailed_service_map',
          matchAgainstPath: 'cypress/e2e/service_map/snapshots/detailed_service_map.png',
          maxDiffThreshold: 0.02, // maximum threshold above which the test should fail
        })
      );
    });

    describe('when there is no data', () => {
      it('shows empty state', () => {
        cy.visitKibana(serviceMapHref);
        // we need to dismiss the service-group call out first
        cy.waitUntilPageContentIsLoaded();
        cy.getByTestSubj('apmUnifiedSearchBar').type('_id : foo{enter}');
        cy.wait('@serviceMap');

        cy.contains('No services available');
        // search bar is still visible
        cy.getByTestSubj('apmUnifiedSearchBar');
      });
    });
  });
});

function prepareCanvasForScreenshot() {
  cy.get('html, body').invoke('attr', 'style', 'height: auto; scroll-behavior: auto;');

  cy.wait(300);
  cy.getByTestSubj('centerServiceMap').click();
  cy.scrollTo('top');
}
