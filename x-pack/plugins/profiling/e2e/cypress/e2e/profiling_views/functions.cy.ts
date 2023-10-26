/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPerCoreWatt,
} from '@kbn/observability-plugin/common';

describe('Functions page', () => {
  const rangeFrom = '2023-04-18T00:00:00.000Z';
  const rangeTo = '2023-04-18T00:00:30.000Z';

  beforeEach(() => {
    cy.loginAsElastic();
  });

  it('opens /topN page when navigating to /functions page', () => {
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.url().should('include', '/app/profiling/functions/topn');
  });

  it('shows TopN functions and Differential TopN functions', () => {
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.contains('TopN functions');
    cy.contains('Differential TopN functions');
  });

  it('validates values in the table', () => {
    cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.wait('@getTopNFunctions');
    const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
    cy.get(firstRowSelector).eq(1).contains('1');
    cy.get(firstRowSelector).eq(2).contains('vmlinux');
    cy.get(firstRowSelector).eq(3).contains('5.46%');
    cy.get(firstRowSelector).eq(4).contains('5.46%');
    cy.get(firstRowSelector).eq(5).contains('1.84 lbs / 0.84 kg');
    cy.get(firstRowSelector).eq(6).contains('$17.37');
    cy.get(firstRowSelector).eq(7).contains('28');
  });

  it('shows function details when action button is clicked on the table ', () => {
    cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.wait('@getTopNFunctions');
    const firstRowSelector =
      '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"] .euiButtonIcon';
    cy.get(firstRowSelector).click();
    cy.contains('Frame information');
    cy.contains('Impact estimates');
    [
      { parentKey: 'informationRows', key: 'executable', value: 'vmlinux' },
      { parentKey: 'informationRows', key: 'function', value: 'N/A' },
      { parentKey: 'informationRows', key: 'sourceFile', value: 'N/A' },
      { parentKey: 'impactEstimates', key: 'totalCPU', value: '5.46%' },
      { parentKey: 'impactEstimates', key: 'selfCPU', value: '5.46%' },
      { parentKey: 'impactEstimates', key: 'samples', value: '28' },
      { parentKey: 'impactEstimates', key: 'selfSamples', value: '28' },
      { parentKey: 'impactEstimates', key: 'coreSeconds', value: '1.4 seconds' },
      { parentKey: 'impactEstimates', key: 'selfCoreSeconds', value: '1.4 seconds' },
      { parentKey: 'impactEstimates', key: 'annualizedCoreSeconds', value: '17.03 days' },
      { parentKey: 'impactEstimates', key: 'annualizedSelfCoreSeconds', value: '17.03 days' },
      { parentKey: 'impactEstimates', key: 'co2Emission', value: '~0.00 lbs / ~0.00 kg' },
      { parentKey: 'impactEstimates', key: 'selfCo2Emission', value: '~0.00 lbs / ~0.00 kg' },
      { parentKey: 'impactEstimates', key: 'annualizedCo2Emission', value: '1.84 lbs / 0.84 kg' },
      {
        parentKey: 'impactEstimates',
        key: 'annualizedSelfCo2Emission',
        value: '1.84 lbs / 0.84 kg',
      },
      { parentKey: 'impactEstimates', key: 'dollarCost', value: '$~0.00' },
      { parentKey: 'impactEstimates', key: 'selfDollarCost', value: '$~0.00' },
      { parentKey: 'impactEstimates', key: 'annualizedDollarCost', value: '$17.37' },
      { parentKey: 'impactEstimates', key: 'annualizedSelfDollarCost', value: '$17.37' },
    ].forEach(({ parentKey, key, value }) => {
      cy.get(`[data-test-subj="${parentKey}_${key}"]`).contains(value);
    });
  });

  it('adds kql filter', () => {
    cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.wait('@getTopNFunctions');
    const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
    cy.get(firstRowSelector).eq(2).contains('vmlinux');
    cy.addKqlFilter({ key: 'Stacktrace.id', value: '-7DvnP1mizQYw8mIIpgbMg' });
    cy.wait('@getTopNFunctions');
    cy.get(firstRowSelector).eq(2).contains('libjvm.so');
  });

  it('Sorting grid', () => {
    cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.wait('@getTopNFunctions');
    [
      {
        columnKey: 'rank',
        columnIndex: 1,
        highRank: 4481,
        lowRank: 1,
        highValue: 4481,
        lowValue: 1,
      },
      {
        columnKey: 'samples',
        columnIndex: 7,
        highRank: 1,
        lowRank: 389,
        highValue: 28,
        lowValue: 0,
      },
      {
        columnKey: 'selfCPU',
        columnIndex: 3,
        highRank: 1,
        lowRank: 389,
        highValue: '5.46%',
        lowValue: '0.00%',
      },
      {
        columnKey: 'totalCPU',
        columnIndex: 4,
        highRank: 3623,
        lowRank: 44,
        highValue: '60.43%',
        lowValue: '0.19%',
      },
      {
        columnKey: 'annualizedCo2',
        columnIndex: 5,
        highRank: 1,
        lowRank: 389,
        highValue: '1.84 lbs / 0.84 kg',
        lowValue: undefined,
      },
      {
        columnKey: 'annualizedDollarCost',
        columnIndex: 6,
        highRank: 1,
        lowRank: 389,
        highValue: '$17.37',
        lowValue: undefined,
      },
    ].forEach(({ columnKey, columnIndex, highRank, highValue, lowRank, lowValue }) => {
      cy.get(`[data-test-subj="dataGridHeaderCell-${columnKey}"]`).click();
      cy.contains('Sort High-Low').click();
      const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
      cy.get(firstRowSelector).eq(1).contains(highRank);
      cy.get(firstRowSelector).eq(columnIndex).contains(highValue);

      cy.get(`[data-test-subj="dataGridHeaderCell-${columnKey}"]`).click();
      cy.contains('Sort Low-High').click();
      cy.get(firstRowSelector).eq(1).contains(lowRank);
      if (lowValue !== undefined) {
        cy.get(firstRowSelector).eq(columnIndex).contains(lowValue);
      } else {
        cy.get(firstRowSelector).eq(columnIndex).should('not.have.value');
      }
    });

    cy.get(`[data-test-subj="dataGridHeaderCell-frame"]`).click();
    cy.contains('Sort Z-A').click();
    const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
    cy.get(firstRowSelector).eq(1).contains('1');
    cy.get(firstRowSelector).eq(2).contains('vmlinux');

    cy.get('[data-test-subj="dataGridHeaderCell-frame"]').click();
    cy.contains('Sort A-Z').click();
    cy.get(firstRowSelector).eq(1).contains('371');
    cy.get(firstRowSelector).eq(2).contains('/');
  });

  describe('Test changing CO2 settings', () => {
    afterEach(() => {
      cy.updateAdvancedSettings({
        [profilingCo2PerKWH]: 0.000379069,
        [profilingDatacenterPUE]: 1.7,
        [profilingPerCoreWatt]: 7,
      });
    });

    it('changes CO2 settings and validate values in the table', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
      cy.wait('@getTopNFunctions');
      const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
      cy.get(firstRowSelector).eq(1).contains('1');
      cy.get(firstRowSelector).eq(2).contains('vmlinux');
      cy.get(firstRowSelector).eq(5).contains('1.84 lbs / 0.84 kg');
      cy.contains('Settings').click();
      cy.contains('Advanced Settings');
      cy.get(`[data-test-subj="advancedSetting-editField-${profilingCo2PerKWH}"]`)
        .clear()
        .type('0.12345');
      cy.get(`[data-test-subj="advancedSetting-editField-${profilingDatacenterPUE}"]`)
        .clear()
        .type('2.4');
      cy.get(`[data-test-subj="advancedSetting-editField-${profilingPerCoreWatt}"]`)
        .clear()
        .type('20');
      cy.contains('Save changes').click();
      cy.getByTestSubj('kbnLoadingMessage').should('exist');
      cy.getByTestSubj('kbnLoadingMessage').should('not.exist', {
        timeout: 50000,
      });
      cy.go('back');
      cy.wait('@getTopNFunctions');
      cy.get(firstRowSelector).eq(5).contains('24.22k lbs / 10.99k');
      const firstRowSelectorActionButton =
        '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"] .euiButtonIcon';
      cy.get(firstRowSelectorActionButton).click();
      [
        { parentKey: 'impactEstimates', key: 'co2Emission', value: '0.02 lbs / 0.01 kg' },
        { parentKey: 'impactEstimates', key: 'selfCo2Emission', value: '0.02 lbs / 0.01 kg' },
        {
          parentKey: 'impactEstimates',
          key: 'annualizedCo2Emission',
          value: '24.22k lbs / 10.99k kg',
        },
        {
          parentKey: 'impactEstimates',
          key: 'annualizedSelfCo2Emission',
          value: '24.22k lbs / 10.99k kg',
        },
      ].forEach(({ parentKey, key, value }) => {
        cy.get(`[data-test-subj="${parentKey}_${key}"]`).contains(value);
      });
    });
  });
});
