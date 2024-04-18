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
        { id: 'annualizedCo2', value: '79.81 lbs / 36.2 kg' },
        { id: 'annualizedCost', value: '$341.05' },
        { id: 'totalNumberOfSamples', value: '17,186' },
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
        { id: 'annualizedCo2', value: '0 lbs / 0 kg', comparisonValue: '79.81 lbs / 36.2 kg' },
        { id: 'annualizedCost', value: '$0', comparisonValue: '$341.05' },
        { id: 'totalNumberOfSamples', value: '0', comparisonValue: '515,580' },
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
        { id: 'overallPerformance', value: '78.01%', icon: 'sortUp_success' },
        {
          id: 'annualizedCo2',
          value: '9.81 lbs / 36.2 kg',
          comparisonValue: '28.23 lbs / 12.81 kg (64.62%)',
          icon: 'comparison_sortUp_success',
        },
        {
          id: 'annualizedCost',
          value: '$341.05',
          comparisonValue: '$120.65 (64.62%)',
          icon: 'comparison_sortUp_success',
        },
        {
          id: 'totalNumberOfSamples',
          value: '17,186',
          comparisonValue: '3,780 (78.01%)',
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
        { id: 'overallPerformance', value: '354.66%', icon: 'sortDown_danger' },
        {
          id: 'annualizedCo2',
          value: '28.23 lbs / 12.81 kg',
          comparisonValue: '79.81 lbs / 36.2 kg (182.67%)',
          icon: 'comparison_sortDown_danger',
        },
        {
          id: 'annualizedCost',
          value: '$120.65',
          comparisonValue: '$341.05 (182.67%)',
          icon: 'comparison_sortDown_danger',
        },
        {
          id: 'totalNumberOfSamples',
          value: '3,780',
          comparisonValue: '17,186 (354.66%)',
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
      cy.get('[data-test-subj="frame"]').contains('vmlinux');
      cy.get('[data-test-subj="comparison_frame"]').contains('vmlinux');

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
      cy.get('[data-test-subj="frame"]').contains('libsystemd-shared-237.so');
      cy.get('[data-test-subj="comparison_frame"]').contains('libjvm.so');
    });
  });
});
