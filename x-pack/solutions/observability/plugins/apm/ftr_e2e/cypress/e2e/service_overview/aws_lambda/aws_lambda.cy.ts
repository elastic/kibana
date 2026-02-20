/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { generateData } from './generate_data';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceOverviewHref = url.format({
  pathname: '/app/apm/services/synth-python/overview',
  query: { rangeFrom: start, rangeTo: end },
});

const apiToIntercept = {
  endpoint: '/internal/apm/services/synth-python/transactions/charts/coldstart_rate?*',
  name: 'coldStartRequest',
};

// Failing: See https://github.com/elastic/kibana/issues/253586
describe.skip('Service overview - aws lambda', () => {
  before(() => {
    synthtrace.index(
      generateData({
        start: new Date(start).getTime(),
        end: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  it('displays a cold start rate chart and not a transaction breakdown chart', () => {
    const { endpoint, name } = apiToIntercept;
    cy.intercept('GET', endpoint).as(name);

    cy.loginAsViewerUser();
    cy.visitKibana(serviceOverviewHref);
    cy.wait(`@${name}`);

    cy.contains('Cold start rate');
    cy.contains('Time spent by span type').should('not.exist');
  });
});
