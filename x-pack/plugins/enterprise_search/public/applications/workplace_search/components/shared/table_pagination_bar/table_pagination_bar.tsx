/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTablePagination } from '@elastic/eui';

interface TablePaginationBarProps {
  itemLabel?: string;
  itemsPerPage?: number;
  totalPages: number;
  totalItems: number;
  activePage?: number;
  showPerPageOptions?: boolean;
  hideLabelCount?: boolean;
  clearFiltersLink?: React.ReactElement;
  onChangePage(nextPage: number): void;
}

const MAX_PAGES = 100;

export const TablePaginationBar: React.FC<TablePaginationBarProps> = ({
  itemLabel = 'Items',
  itemsPerPage = 10,
  totalPages,
  totalItems,
  activePage = 1,
  showPerPageOptions = false,
  hideLabelCount = false,
  onChangePage,
  clearFiltersLink,
}) => {
  // EUI component starts page at 0. API starts at 1.
  const currentPage = activePage - 1;
  const showAllPages = totalPages < MAX_PAGES;

  const pageRangeText = () => {
    const rangeEnd = activePage === totalPages ? totalItems : itemsPerPage * activePage;
    const rangeStart = currentPage * itemsPerPage + 1;
    const rangeEl = (
      <strong>
        {rangeStart}-{rangeEnd}
      </strong>
    );
    const totalEl = <strong>{totalItems.toLocaleString()}</strong>;

    return (
      <EuiFlexGroup alignItems="center" justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <div>
            Showing {rangeEl}
            {showAllPages && (
              <>
                {' '}
                of {totalEl} {itemLabel}
              </>
            )}
          </div>
        </EuiFlexItem>
        <EuiFlexItem>{clearFiltersLink}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiFlexGroup alignItems="center">
      {!hideLabelCount && <EuiFlexItem>{pageRangeText()}</EuiFlexItem>}
      <EuiFlexItem>
        <EuiTablePagination
          showPerPageOptions={showPerPageOptions}
          activePage={currentPage}
          itemsPerPage={itemsPerPage}
          pageCount={showAllPages ? totalPages : MAX_PAGES}
          onChangePage={onChangePage}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
