/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTableSortingType,
  EuiText,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { RowsPerPage } from './rows_per_page';

interface PaginationProps<T> {
  total?: number;
  searchAfter?: string;
  onPageChange: (searchAfter?: string) => void;
  perPage?: number;
  onPerPageChange: (perPage: number) => void;
  itemsPerPage?: number[];
  sort: EuiTableSortingType<T>;
}

export function Pagination<T>({
  total,
  onPageChange,
  onPerPageChange,
  searchAfter,
  perPage = 10,
  itemsPerPage = [10, 20, 50, 100],
  sort,
}: PaginationProps<T>) {
  const [paginationHistory, setPaginationHistory] = useState<string[]>([]);
  const [sorting, setSorting] = useState<EuiTableSortingType<T>>(sort);

  // When the sorting changes we need to reset the pagination history
  useEffect(() => {
    if (!isEqual(sorting, sort)) {
      setPaginationHistory([]);
      setSorting(sort);
    }
  }, [sorting, sort]);

  const nextOnClickHandler = () => {
    setPaginationHistory((prev) => {
      if (searchAfter) {
        prev.push(searchAfter);
        onPageChange(searchAfter);
      }
      return prev;
    });
  };

  const previousOnClickHandler = () => {
    setPaginationHistory((prev) => {
      prev.pop(); // this is the current page
      onPageChange(prev[prev.length - 1]); // this is the actual previous page
      return prev;
    });
  };

  // When the per page changes, we need to reset the pagination history
  const handlePerPageChange = (newPerPage: number) => {
    setPaginationHistory([]);
    onPerPageChange(newPerPage);
  };

  if (!total) return null;

  const disablePrevious = paginationHistory.length === 0;
  const disableNext = Math.ceil(total / perPage) === paginationHistory.length + 1;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow={0}>
        <RowsPerPage
          perPage={perPage}
          onPerPageChange={handlePerPageChange}
          itemsPerPage={itemsPerPage}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={0}>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={0}>
            <EuiText size="s">
              {i18n.translate('xpack.entityManager.pagination.pageOfFlexItemLabel', {
                defaultMessage: 'Page {current} of {total}',
                values: {
                  current: paginationHistory.length + 1,
                  total: Math.ceil(total / perPage),
                },
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
            <EuiButtonIcon
              data-test-subj="entityManagerPaginationPreviousButton"
              iconType="arrowLeft"
              aria-label={i18n.translate('xpack.entityManager.pagination.previousLabel', {
                defaultMessage: 'Previous page',
              })}
              onClick={previousOnClickHandler}
              disabled={disablePrevious}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
            <EuiButtonIcon
              data-test-subj="entityManagerPaginationNextButton"
              iconType="arrowRight"
              aria-label={i18n.translate('xpack.entityManager.pagination.nextLabel', {
                defaultMessage: 'Next page',
              })}
              onClick={nextOnClickHandler}
              disabled={disableNext}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
