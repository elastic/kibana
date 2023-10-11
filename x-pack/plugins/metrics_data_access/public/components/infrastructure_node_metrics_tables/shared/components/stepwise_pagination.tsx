/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPagination } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

interface CursorPaginationProps {
  ariaLabel: string;
  currentPageIndex: number;
  pageCount: number;
  setCurrentPageIndex: (nextPageIndex: number) => void;
}

const EuiStepwisePagination = euiStyled(EuiPagination)`
  [data-test-subj="pagination-button-first"],
  [data-test-subj="pagination-button-last"] {
    display: none;
  }
`;

export function StepwisePagination({
  ariaLabel,
  pageCount,
  currentPageIndex,
  setCurrentPageIndex,
}: CursorPaginationProps) {
  return (
    <EuiStepwisePagination
      aria-label={ariaLabel}
      pageCount={pageCount}
      activePage={currentPageIndex}
      onPageClick={setCurrentPageIndex}
      compressed
    />
  );
}
