/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Differential Functions page', () => {
  const rangeFrom = '2023-04-18T00:00:00.000Z';
  const rangeTo = '2023-04-18T00:02:00.000Z';

  const comparisonRangeFrom = '2023-04-18T00:02:00.000Z';
  const comparisonRangeTo = '2023-04-18T00:04:00.000Z';

  beforeEach(() => {
    cy.loginAsElastic();
  });

  it('opens differential page', () => {
    cy.visitKibana('/app/profiling/functions/differential', { rangeFrom, rangeTo });
    cy.contains('Baseline functions');
    cy.contains('Comparison functions');
  });

  describe('summary', () => {
    it('shows only the baseline values when comparison data is not available', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential', { rangeFrom, rangeTo });
      // wait for both apis to finisto move on
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '0%' },
        { id: 'annualizedCo2', value: '672.14 lbs / 304.88 kg' },
        { id: 'annualizedCost', value: '$776.25' },
        { id: 'totalNumberOfSamples', value: '5,004' },
      ].forEach((item) => {
        cy.get(`[data-test-subj="${item.id}_value"]`).contains(item.value);
        cy.get(`[data-test-subj="${item.id}_comparison_value"]`).should('not.exist');
      });
    });

    it('shows empty baseline values when data is not available', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential', {
        comparisonRangeFrom: rangeFrom,
        comparisonRangeTo: rangeTo,
      });
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '0%' },
        { id: 'annualizedCo2', value: '0 lbs / 0 kg', comparisonValue: '672.14 lbs / 304.88 kg' },
        { id: 'annualizedCost', value: '$0', comparisonValue: '$776.25' },
        { id: 'totalNumberOfSamples', value: '0', comparisonValue: '37,530' },
      ].forEach((item) => {
        cy.get(`[data-test-subj="${item.id}_value"]`).contains(item.value);
        if (item.comparisonValue) {
          cy.get(`[data-test-subj="${item.id}_comparison_value"]`).contains(item.comparisonValue);
        }
      });
    });

    it('show gained performance when comparison data has less samples than baseline', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential', {
        rangeFrom,
        rangeTo,
        comparisonRangeFrom,
        comparisonRangeTo,
      });
      // wait for both apis to finisto move on
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '33.09%', icon: 'sortUp_success' },
        {
          id: 'annualizedCo2',
          value: '672.14 lbs / 304.88 kg',
          comparisonValue: '449.7 lbs / 203.98 kg (33.09%)',
          icon: 'comparison_sortUp_success',
        },
        {
          id: 'annualizedCost',
          value: '$776.25',
          comparisonValue: '$519.36 (33.09%)',
          icon: 'comparison_sortUp_success',
        },
        {
          id: 'totalNumberOfSamples',
          value: '5,004',
          comparisonValue: '3,348 (33.09%)',
          icon: 'comparison_sortUp_success',
        },
      ].forEach((item) => {
        cy.get(`[data-test-subj="${item.id}_value"]`).contains(item.value);
        cy.get(`[data-test-subj="${item.id}_${item.icon}"]`).should('exist');
        if (item.comparisonValue) {
          cy.get(`[data-test-subj="${item.id}_comparison_value"]`).contains(item.comparisonValue);
        }
      });
    });

    it('show lost performance when comparison data has more samples than baseline', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential', {
        rangeFrom: comparisonRangeFrom,
        rangeTo: comparisonRangeTo,
        comparisonRangeFrom: rangeFrom,
        comparisonRangeTo: rangeTo,
      });
      // wait for both apis to finisto move on
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '49.46%', icon: 'sortDown_danger' },
        {
          id: 'annualizedCo2',
          value: '449.7 lbs / 203.98 kg',
          comparisonValue: '672.14 lbs / 304.88 kg (49.46%)',
          icon: 'comparison_sortDown_danger',
        },
        {
          id: 'annualizedCost',
          value: '$519.36',
          comparisonValue: '$776.25 (49.46%)',
          icon: 'comparison_sortDown_danger',
        },
        {
          id: 'totalNumberOfSamples',
          value: '3,348',
          comparisonValue: '5,004 (49.46%)',
          icon: 'comparison_sortDown_danger',
        },
      ].forEach((item) => {
        cy.get(`[data-test-subj="${item.id}_value"]`).contains(item.value);
        cy.get(`[data-test-subj="${item.id}_${item.icon}"]`).should('exist');
        if (item.comparisonValue) {
          cy.get(`[data-test-subj="${item.id}_comparison_value"]`).contains(item.comparisonValue);
        }
      });
    });
    it('show empty summary when no data is availble', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential');
      // wait for both apis to finisto move on
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '0%' },
        { id: 'annualizedCo2', value: '0 lbs / 0 kg' },
        { id: 'annualizedCost', value: '$0' },
        { id: 'totalNumberOfSamples', value: '0' },
      ].forEach((item) => {
        cy.get(`[data-test-subj="${item.id}_value"]`).contains(item.value);
        cy.get(`[data-test-subj="${item.id}_comparison_value"]`).should('not.exist');
      });
    });
  });
});
