/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import { synthtrace } from '../../../../../synthtrace';
import { generateData } from './generate_data';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceOverviewHref = url.format({
  pathname: '/app/apm/services',
  query: { rangeFrom: start, rangeTo: end },
});

const specialServiceName =
  'service 1 / ? # [ ] @ ! $ &  ( ) * + , ; = < > % {} | ^ ` <>';

describe('Service inventory - header filters', () => {
  before(async () => {
    await synthtrace.index(
      generateData({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
        specialServiceName,
      })
    );
  });

  after(async () => {
    await synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  describe('Filtering by kuerybar', () => {
    it('filters by service.name with special characters', () => {
      cy.visit(serviceOverviewHref);
      cy.contains('Services');
      cy.contains('opbeans-node');
      cy.contains('service 1');
      cy.get('[data-test-subj="headerFilterKuerybar"]')
        .type(`service.name: "${specialServiceName}"`)
        .type('{enter}');
      cy.contains('service 1');
      cy.url().should('include', encodeURIComponent(specialServiceName));
    });
  });
});
