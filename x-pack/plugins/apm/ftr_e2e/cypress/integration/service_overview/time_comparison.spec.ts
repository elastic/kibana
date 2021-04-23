/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const apisToIntercept = [
  {
    endpoint: '/api/apm/services/opbeans-java/transactions/charts/latency',
    as: 'latencyChartRequest',
  },
  {
    endpoint: '/api/apm/services/opbeans-java/throughput',
    as: 'throughputChartRequest',
  },
  {
    endpoint: '/api/apm/services/opbeans-java/transactions/charts/error_rate',
    as: 'errorRateChartRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-java/transactions/groups/detailed_statistics',
    as: 'transactionGroupsDetailedRequest',
  },
  {
    endpoint: '/api/apm/services/opbeans-java/error_groups/detailed_statistics',
    as: 'errorGroupsDetailedRequest',
  },
  {
    endpoint:
      '/api/apm/services/opbeans-java/service_overview_instances/detailed_statistics',
    as: 'instancesDetailedRequest',
  },
];

describe('Service overview: Time Comparison', () => {
  it('enables by default the time comparison feature with Last 24 hours selected', () => {
    const endDate = new Date(Cypress.env('END_DATE'));
    cy.clock(endDate);
    cy.visit('/app/apm/services/opbeans-java/overview');
    cy.url().should('include', 'comparisonEnabled=true&comparisonType=day');
  });

  it('toggles comparison off disables select box and APIs are called without comparison time range', () => {
    apisToIntercept.map(({ endpoint, as }) => {
      cy.intercept('GET', endpoint).as(as);
    });
    const endDate = new Date(Cypress.env('END_DATE'));
    cy.clock(endDate);
    cy.visit('/app/apm/services/opbeans-java/overview');
    cy.contains('opbeans-java');

    // Comparison is enabled by default
    cy.get('[data-test-subj="comparisonSelect"]').should('be.enabled');
    const comparisonStartEnd =
      'comparisonStart=2020-12-07T14%3A12%3A00.000Z&comparisonEnd=2020-12-07T14%3A27%3A56.135Z';
    // When the page loads it fetches all APIs with comparison time range
    cy.wait(apisToIntercept.map(({ as }) => `@${as}`)).then((interceptions) => {
      interceptions.map((interception) => {
        expect(interception.request.url).include(comparisonStartEnd);
      });
    });

    // toggles off comparison
    cy.contains('Comparison 2').click();
    cy.get('[data-test-subj="comparisonSelect"]').should('be.disabled');
    // When comparison is disabled APIs are called withou comparison time range
    cy.wait(apisToIntercept.map(({ as }) => `@${as}`)).then((interceptions) => {
      interceptions.map((interception) => {
        expect(interception.request.url).not.include(comparisonStartEnd);
      });
    });
  });

  it('changes comparison type', () => {
    apisToIntercept.map(({ endpoint, as }) => {
      cy.intercept('GET', endpoint).as(as);
    });
    const endDate = new Date(Cypress.env('END_DATE'));
    cy.clock(endDate);
    cy.visit('/app/apm/services/opbeans-java/overview');
    cy.contains('opbeans-java');

    // When the page loads it fetches all APIs with comparison type day
    cy.wait(apisToIntercept.map(({ as }) => `@${as}`)).then((interceptions) => {
      interceptions.map((interception) => {
        expect(interception.request.url).include(
          'comparisonStart=2020-12-07T14%3A12%3A00.000Z&comparisonEnd=2020-12-07T14%3A27%3A56.135Z'
        );
      });
    });
    // selects another comparison type
    cy.get('[data-test-subj="comparisonSelect"]').select('week');
    // When comparison type changes triggers all API calls with comparison type week
    cy.wait(apisToIntercept.map(({ as }) => `@${as}`)).then((interceptions) => {
      interceptions.map((interception) => {
        expect(interception.request.url).include(
          'comparisonStart=2020-12-01T14%3A12%3A00.000Z&comparisonEnd=2020-12-01T14%3A27%3A56.135Z'
        );
      });
    });
  });

  it('changes comparison type when a new time range is selected', () => {
    const endDate = new Date(Cypress.env('END_DATE'));
    cy.clock(endDate);
    cy.visit('/app/apm/services/opbeans-java/overview');
    cy.contains('opbeans-java');
    cy.contains('Day before');
    cy.visit(
      '/app/apm/services/opbeans-java/overview?rangeFrom=now-2d&rangeTo=now'
    );
    cy.contains('Week before');
    cy.visit(
      '/app/apm/services/opbeans-java/overview?rangeFrom=now-8d&rangeTo=now'
    );
    cy.contains('22/11 09:26 - 30/11 09:27');
  });
});
