/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import moment from 'moment';
import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceOverviewPath = '/app/apm/services/opbeans-java/overview';
const serviceOverviewHref = url.format({
  pathname: serviceOverviewPath,
  query: { rangeFrom: start, rangeTo: end },
});

const apisToIntercept = [
  {
    endpoint:
      '/internal/apm/services/opbeans-java/transactions/charts/latency?*',
    name: 'latencyChartRequest',
  },
  {
    endpoint: '/internal/apm/services/opbeans-java/throughput?*',
    name: 'throughputChartRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-java/transactions/charts/error_rate?*',
    name: 'errorRateChartRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-java/transactions/groups/detailed_statistics?*',
    name: 'transactionGroupsDetailedRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-java/errors/groups/detailed_statistics?*',
    name: 'errorGroupsDetailedRequest',
  },
  {
    endpoint:
      '/internal/apm/services/opbeans-java/service_overview_instances/detailed_statistics?*',
    name: 'instancesDetailedRequest',
  },
];

describe.skip('Service overview: Time Comparison', () => {
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

  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  it('enables by default the time comparison feature with Last 24 hours selected', () => {
    cy.visit(serviceOverviewPath);
    cy.url().should('include', 'comparisonEnabled=true');
    cy.url().should('include', 'offset=1d');
  });

  describe('when comparison is toggled off', () => {
    it('disables select box', () => {
      cy.visit(serviceOverviewHref);
      cy.contains('opbeans-java');

      // Comparison is enabled by default
      cy.get('[data-test-subj="comparisonSelect"]').should('be.enabled');

      // toggles off comparison
      cy.contains('Comparison').click();
      cy.get('[data-test-subj="comparisonSelect"]').should('be.disabled');
    });

    it('calls APIs without comparison time range', () => {
      apisToIntercept.map(({ endpoint, name }) => {
        cy.intercept('GET', endpoint).as(name);
      });
      cy.visit(serviceOverviewHref);

      cy.get('[data-test-subj="comparisonSelect"]').should('be.enabled');
      const offset = `offset=1d`;

      // When the page loads it fetches all APIs with comparison time range
      cy.wait(apisToIntercept.map(({ name }) => `@${name}`)).then(
        (interceptions) => {
          interceptions.map((interception) => {
            expect(interception.request.url).include(offset);
          });
        }
      );

      cy.contains('opbeans-java');

      // toggles off comparison
      cy.contains('Comparison').click();
      cy.get('[data-test-subj="comparisonSelect"]').should('be.disabled');
      // When comparison is disabled APIs are called withou comparison time range
      cy.wait(apisToIntercept.map(({ name }) => `@${name}`)).then(
        (interceptions) => {
          interceptions.map((interception) => {
            expect(interception.request.url).not.include(offset);
          });
        }
      );
    });
  });

  it('changes comparison type', () => {
    apisToIntercept.map(({ endpoint, name }) => {
      cy.intercept('GET', endpoint).as(name);
    });
    cy.visit(serviceOverviewPath);
    cy.contains('opbeans-java');
    // opens the page with "Day before" selected
    cy.get('[data-test-subj="comparisonSelect"]').should('have.value', '1d');

    // selects another comparison type
    cy.get('[data-test-subj="comparisonSelect"]').select('1w');
    cy.get('[data-test-subj="comparisonSelect"]').should('have.value', '1w');
  });

  it('changes comparison type when a new time range is selected', () => {
    cy.visit(serviceOverviewHref);
    cy.contains('opbeans-java');
    // Time comparison default value
    cy.get('[data-test-subj="comparisonSelect"]').should('have.value', '1d');
    cy.contains('Day before');
    cy.contains('Week before');

    cy.selectAbsoluteTimeRange(
      '2021-10-10T00:00:00.000Z',
      '2021-10-20T00:00:00.000Z'
    );

    cy.get('[data-test-subj="superDatePickerApplyTimeButton"]').click();

    cy.get('[data-test-subj="comparisonSelect"]').should(
      'have.value',
      '864000000ms'
    );
    cy.get('[data-test-subj="comparisonSelect"]').should(
      'not.contain.text',
      'Day before'
    );
    cy.get('[data-test-subj="comparisonSelect"]').should(
      'not.contain.text',
      'Week before'
    );

    cy.changeTimeRange('Today');
    cy.contains('Day before');
    cy.contains('Week before');

    cy.changeTimeRange('Last 24 hours');
    cy.get('[data-test-subj="comparisonSelect"]').should('have.value', '1d');
    cy.contains('Day before');
    cy.contains('Week before');

    cy.changeTimeRange('Last 7 days');
    cy.get('[data-test-subj="comparisonSelect"]').should('have.value', '1w');
    cy.get('[data-test-subj="comparisonSelect"]').should(
      'contain.text',
      'Week before'
    );
    cy.get('[data-test-subj="comparisonSelect"]').should(
      'not.contain.text',
      'Day before'
    );
    cy.contains('Week before');
  });

  it('hovers over throughput chart shows previous and current period', () => {
    apisToIntercept.map(({ endpoint, name }) => {
      cy.intercept('GET', endpoint).as(name);
    });
    cy.visit(
      url.format({
        pathname: serviceOverviewPath,
        query: {
          rangeFrom: moment(end).subtract(15, 'minutes').toISOString(),
          rangeTo: end,
        },
      })
    );
    cy.contains('opbeans-java');
    cy.wait('@throughputChartRequest');
    cy.get('[data-test-subj="throughput"]')
      .get('#echHighlighterClipPath__throughput')
      .realHover({ position: 'center' });
    cy.contains('Week before');
    cy.contains('0 tpm');

    cy.contains('Throughput');
    cy.contains('0 tpm');
  });
});
