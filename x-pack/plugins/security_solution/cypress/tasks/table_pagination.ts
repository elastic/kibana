/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOADING_SPINNER } from '../screens/loading';
import {
  rowsPerPageSelector,
  tablePageSelector,
  TABLE_PER_PAGE_POPOVER_BTN,
  TABLE_SORT_COLUMN_BTN,
} from '../screens/table_pagination';

export const goToTablePage = (pageNumber: number) => {
  cy.get(LOADING_SPINNER).should('not.exist');
  cy.get(tablePageSelector(pageNumber)).last().click({ force: true });
};

export const sortFirstTableColumn = () => {
  cy.get(TABLE_SORT_COLUMN_BTN).first().click();
};

export const expectTablePage = (pageNumber: number) => {
  cy.get(tablePageSelector(pageNumber)).should('have.text', pageNumber);
};

export const setRowsPerPageTo = (rowsCount: number) => {
  cy.get(TABLE_PER_PAGE_POPOVER_BTN).click({ force: true });
  cy.get(rowsPerPageSelector(rowsCount))
    .pipe(($el) => $el.trigger('click'))
    .should('not.exist');
};

export const expectRowsPerPage = (rowsCount: number) => {
  cy.get(TABLE_PER_PAGE_POPOVER_BTN).contains(`Rows per page: ${rowsCount}`);
};

export const sortByTableColumn = (columnName: string, direction: 'asc' | 'desc' = 'asc') => {
  cy.get(TABLE_SORT_COLUMN_BTN).contains(columnName).click({ force: true });

  if (direction === 'desc') {
    cy.get(TABLE_SORT_COLUMN_BTN).contains(columnName).click({ force: true });
  }
};

export const expectTableSorting = (columnName: string, direction: 'asc' | 'desc') => {
  const tableSortButton = cy.get(`${TABLE_SORT_COLUMN_BTN}.euiTableHeaderButton-isSorted`);

  tableSortButton.contains(columnName);
  tableSortButton
    .parents('.euiTableHeaderCell')
    .should('have.attr', 'aria-sort', direction === 'asc' ? 'ascending' : 'descending');
};
