/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiPagination } from '@elastic/eui';

interface Props {
  current: number;
  totalPages: number;
  onChange(pageNumber: number): void;
  'aria-label': string;
}

export const PagingView: React.FC<Props> = ({
  current,
  onChange,
  totalPages,
  'aria-label': ariaLabel,
}) => (
  <EuiPagination
    pageCount={totalPages}
    activePage={current - 1} // EuiPagination is 0-indexed, Search UI is 1-indexed
    onPageClick={(page) => onChange(page + 1)} // EuiPagination is 0-indexed, Search UI is 1-indexed
    aria-label={ariaLabel}
  />
);
