/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { checkA11y } from '../../../support/commands';
import { generateData } from './generate_data';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const goServiceInfraPageHref = url.format({
  pathname: '/app/apm/services/synth-go/infrastructure',
  query: { rangeFrom: start, rangeTo: end },
});

const javaServiceInfraPageHref = url.format({
  pathname: '/app/apm/services/synth-java/infrastructure',
  query: { rangeFrom: start, rangeTo: end },
});

const nodeServiceInfraPageHref = url.format({
  pathname: '/app/apm/services/synth-node/infrastructure',
  query: { rangeFrom: start, rangeTo: end },
});

describe('Infrastructure page', () => {
  before(() => {
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

  beforeEach(() => {
    cy.loginAsEditorUser();
  });

  describe('when data is loaded', () => {
    it('has no detectable a11y violations on load', () => {
      cy.visitKibana(goServiceInfraPageHref);
      cy.contains('Infrastructure');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
    });

    describe('when container ids, pod names and host names are returned by the api call', () => {
      it('shows all tabs', () => {
        cy.visitKibana(goServiceInfraPageHref);
        cy.contains('Containers');
        cy.contains('Pods');
        cy.contains('Hosts');
      });
    });

    describe('when only host names are returned by the api call', () => {
      it('shows only Hosts tab', () => {
        cy.visitKibana(javaServiceInfraPageHref);
        cy.contains('Hosts');
      });
    });

    describe('when none infrastructure attributes are returned by the api call', () => {
      it('shows no data message', () => {
        cy.visitKibana(nodeServiceInfraPageHref);
        cy.contains('No results match your search criteria.');
      });
    });
  });
});
