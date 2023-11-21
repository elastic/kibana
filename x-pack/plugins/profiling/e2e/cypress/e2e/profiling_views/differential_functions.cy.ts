/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Differential Functions page', () => {
  const rangeFrom = '2023-04-18T00:00:00.000Z';
  const rangeTo = '2023-04-18T00:00:30.000Z';

  const comparisonRangeFrom = '2023-04-18T00:01:00.000Z';
  const comparisonRangeTo = '2023-04-18T00:01:30.000Z';

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
        { id: 'annualizedCo2', value: '33.79 lbs / 15.33 kg' },
        { id: 'annualizedCost', value: '$318.32' },
        { id: 'totalNumberOfSamples', value: '513' },
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
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '0%' },
        { id: 'annualizedCo2', value: '0 lbs / 0 kg', comparisonValue: '33.79 lbs / 15.33 kg' },
        { id: 'annualizedCost', value: '$0', comparisonValue: '$318.32' },
        { id: 'totalNumberOfSamples', value: '0', comparisonValue: '15,390' },
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
        { id: 'overallPerformance', value: '65.89%', icon: 'sortUp_success' },
        {
          id: 'annualizedCo2',
          value: '33.79 lbs / 15.33 kg',
          comparisonValue: '11.53 lbs / 5.23 kg (65.89%)',
          icon: 'comparison_sortUp_success',
        },
        {
          id: 'annualizedCost',
          value: '$318.32',
          comparisonValue: '$108.59 (65.89%)',
          icon: 'comparison_sortUp_success',
        },
        {
          id: 'totalNumberOfSamples',
          value: '513',
          comparisonValue: '175 (65.89%)',
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
        { id: 'overallPerformance', value: '193.14%', icon: 'sortDown_danger' },
        {
          id: 'annualizedCo2',
          value: '11.53 lbs / 5.23 kg',
          comparisonValue: '33.79 lbs / 15.33 kg (193.14%)',
          icon: 'comparison_sortDown_danger',
        },
        {
          id: 'annualizedCost',
          value: '$108.59',
          comparisonValue: '$318.32 (193.14%)',
          icon: 'comparison_sortDown_danger',
        },
        {
          id: 'totalNumberOfSamples',
          value: '175',
          comparisonValue: '513 (193.14%)',
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

    it('adds kql filter', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential', {
        rangeFrom: comparisonRangeFrom,
        rangeTo: comparisonRangeTo,
        comparisonRangeFrom: rangeFrom,
        comparisonRangeTo: rangeTo,
      });
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      cy.get('[data-test-subj="topNFunctionsGrid"] .euiDataGridRow').should('have.length.gt', 1);
      cy.get('[data-test-subj="TopNFunctionsComparisonGrid"] .euiDataGridRow').should(
        'have.length.gt',
        1
      );
      cy.get(
        '[data-test-subj="topNFunctionsGrid"] [data-test-subj="profilingStackFrameSummaryLink"]'
      ).contains('vmlinux');
      cy.get(
        '[data-test-subj="TopNFunctionsComparisonGrid"] [data-test-subj="profilingStackFrameSummaryLink"]'
      ).contains('vmlinux');

      cy.addKqlFilter({
        key: 'process.thread.name',
        value: '108795321966692',
      });
      cy.addKqlFilter({
        key: 'Stacktrace.id',
        value: '-7DvnP1mizQYw8mIIpgbMg',
        dataTestSubj: 'profilingComparisonUnifiedSearchBar',
      });
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      cy.get(
        '[data-test-subj="topNFunctionsGrid"] [data-test-subj="profilingStackFrameSummaryLink"]'
      ).contains('libsystemd-shared-237.so');
      cy.get(
        '[data-test-subj="TopNFunctionsComparisonGrid"] [data-test-subj="profilingStackFrameSummaryLink"]'
      ).contains('libjvm.so');
    });
  });
});
