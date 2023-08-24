/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
describe('Stacktraces page', () => {
  const rangeFrom = 'now-1y';
  const rangeTo = 'now';

  beforeEach(() => {
    cy.loginAsElastic();
  });

  it('checks values in the summary section', () => {
    cy.intercept('GET', '/internal/profiling/storage_explorer/summary?*').as('summary');
    cy.visitKibana('/app/profiling/storage-explorer', { rangeFrom, rangeTo });
    cy.contains('Storage Explorer');
    cy.wait('@summary');
    [
      { key: 'totalData', value: '3.5 MB' },
      { key: 'dailyDataGeneration', value: '1.5 KB' },
      { key: 'totalDebugSymbolsSize', value: '1.1 MB' },
      { key: 'diskSpaceUsed', value: '~0.00%' },
      { key: 'numberOfHostsAgents', value: '1' },
    ].forEach(({ key, value }) => {
      cy.get(`[data-test-subj="${key}"]`).contains(value);
    });
  });

  describe('Host agent breakdown', () => {
    it('displays host agent details', () => {
      cy.intercept('GET', '/internal/profiling/storage_explorer/host_storage_details?*').as(
        'hostDetails'
      );
      cy.visitKibana('/app/profiling/storage-explorer', { rangeFrom, rangeTo });
      cy.contains('Storage Explorer');
      cy.wait('@hostDetails');
      const firstRowSelector = 'table > tbody .euiTableRowCell';
      cy.get(firstRowSelector).eq(0).get('.euiTableCellContent__text').contains('3145700');
      cy.get('[data-test-subj="hostName_ip-172-23-180-16"]').contains(
        'ip-172-23-180-16 [8457605156473051743]'
      );
      cy.get('[data-test-subj="hostName_ip-172-23-180-16"]').should(
        'have.attr',
        'href',
        '/app/profiling/flamegraphs/flamegraph?kuery=host.id%3A%20%228457605156473051743%22&rangeFrom=now-1y&rangeTo=now'
      );
      cy.get(firstRowSelector).eq(4).get('.euiTableCellContent').contains('0.0 B');
      cy.get(firstRowSelector).eq(3).get('.euiTableCellContent').contains('521.3 KB');
      cy.get(firstRowSelector).eq(5).get('.euiTableCellContent').contains('521.3 KB');
    });
  });

  describe('Data breakdown', () => {
    it('displays correct values per index', () => {
      cy.intercept('GET', '/internal/profiling/storage_explorer/indices_storage_details?*').as(
        'indicesDetails'
      );
      cy.visitKibana('/app/profiling/storage-explorer', { rangeFrom, rangeTo });
      cy.contains('Storage Explorer');
      cy.contains('Data breakdown').click();
      cy.wait('@indicesDetails');
      [
        { indexName: 'stackframes', docSize: '7,616', size: '1.1 MB' },
        { indexName: 'stacktraces', docSize: '2,217', size: '1.8 MB' },
        { indexName: 'executables', docSize: '85', size: '20.9 KB' },
        { indexName: 'metrics', docSize: '0', size: '249.0 B' },
        { indexName: 'events', docSize: '3,242', size: '525.2 KB' },
      ].forEach(({ indexName, docSize, size }) => {
        cy.get(`[data-test-subj="${indexName}_docSize"]`).contains(docSize);
        cy.get(`[data-test-subj="${indexName}_size"]`).contains(size);
      });
    });

    it('displays top 10 indices in the table', () => {
      cy.intercept('GET', '/internal/profiling/storage_explorer/indices_storage_details?*').as(
        'indicesDetails'
      );
      cy.visitKibana('/app/profiling/storage-explorer', { rangeFrom, rangeTo });
      cy.contains('Storage Explorer');
      cy.contains('Data breakdown').click();
      cy.wait('@indicesDetails');
      cy.get('table > tbody tr.euiTableRow').should('have.length', 10);
    });

    it('displays a chart with percentage of each index', () => {
      cy.intercept('GET', '/internal/profiling/storage_explorer/indices_storage_details?*').as(
        'indicesDetails'
      );
      cy.visitKibana('/app/profiling/storage-explorer', { rangeFrom, rangeTo });
      cy.contains('Storage Explorer');
      cy.contains('Data breakdown').click();
      cy.wait('@indicesDetails');

      const indices = [
        { index: 'Stackframes', size: '1.1 MB', perc: '32%' },
        { index: 'Samples', size: '525.2 KB', perc: '15%' },
        { index: 'Executables', size: '20.9 KB', perc: '1%' },
        { index: 'Metrics', size: '249.0 B', perc: '0%' },
        { index: 'Stacktraces', size: '1.8 MB', perc: '52%' },
      ];

      cy.get('.echChartPointerContainer table tbody tr').each(($row, idx) => {
        cy.wrap($row).find('th').contains(indices[idx].index);
        cy.wrap($row).find('td').eq(0).contains(indices[idx].size);
        cy.wrap($row).find('td').eq(1).contains(indices[idx].perc);
      });
    });
  });
});
