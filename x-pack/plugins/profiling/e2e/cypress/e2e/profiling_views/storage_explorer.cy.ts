/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
describe('Storage explorer page', () => {
  const rangeFrom = '2023-04-18T00:00:00.000Z';
  const rangeTo = '2023-04-18T00:05:00.000Z';

  beforeEach(() => {
    cy.loginAsElastic();
  });

  it('does not show warning for distinct probabilistic profiling values found', () => {
    cy.intercept('GET', '/internal/profiling/storage_explorer/summary?*').as('summary');
    cy.visitKibana('/app/profiling/storage-explorer', {
      rangeFrom: '2023-08-08T18:00:00.000Z',
      rangeTo: '2023-08-08T20:00:00.000Z',
    });
    cy.contains('Storage Explorer');
    cy.wait('@summary');
    cy.contains(
      "We've identified 2 distinct probabilistic profiling values. Make sure to update them."
    ).should('not.exist');
  });

  it('shows warning for distinct probabilistic profiling values found', () => {
    cy.intercept('GET', '/internal/profiling/storage_explorer/summary?*', {
      fixture: 'storage_explorer_summary.json',
    }).as('summary');
    cy.visitKibana('/app/profiling/storage-explorer', {
      rangeFrom: '2023-08-08T18:00:00.000Z',
      rangeTo: '2023-08-08T20:00:00.000Z',
    });
    cy.contains('Storage Explorer');
    cy.wait('@summary');
    cy.contains(
      "We've identified 2 distinct probabilistic profiling values. Make sure to update them."
    );
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
      cy.get('[data-test-subj="hostId_8457605156473051743"]').contains('[8457605156473051743]');
      cy.get('[data-test-subj="hostId_8457605156473051743"]').should(
        'have.attr',
        'href',
        '/app/profiling/flamegraphs/flamegraph?kuery=host.id%3A%20%228457605156473051743%22&rangeFrom=2023-04-18T00%3A00%3A00.000Z&rangeTo=2023-04-18T00%3A05%3A00.000Z'
      );
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
        { indexName: 'stackframes', docSize: '7,616' },
        { indexName: 'stacktraces', docSize: '2,217' },
        { indexName: 'executables', docSize: '85' },
        { indexName: 'metrics', docSize: '0' },
        { indexName: 'events', docSize: '3,242' },
      ].forEach(({ indexName, docSize }) => {
        cy.get(`[data-test-subj="${indexName}_docSize"]`).contains(docSize);
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
        { index: 'Stackframes', perc: '32%' },
        { index: 'Samples', perc: '15%' },
        { index: 'Executables', perc: '1%' },
        { index: 'Metrics', perc: '0%' },
        { index: 'Stacktraces', perc: '52%' },
      ];

      cy.get('.echChartPointerContainer table tbody tr').each(($row, idx) => {
        cy.wrap($row).find('th').contains(indices[idx].index);
        cy.wrap($row).find('td').contains(indices[idx].perc);
      });
    });
  });
});
