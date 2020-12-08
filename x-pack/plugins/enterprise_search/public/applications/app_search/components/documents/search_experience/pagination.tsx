/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
// @ts-expect-error types are not available for this package yet
import { Paging, ResultsPerPage } from '@elastic/react-search-ui';
import { PagingView, ResultsPerPageView } from './views';

export const Pagination: React.FC<{ 'aria-label': string }> = ({ 'aria-label': ariaLabel }) => (
  <EuiFlexGroup alignItems="center" className="documentsSearchExperience__pagingInfo">
    <EuiFlexItem>
      <Paging view={PagingView} aria-label={ariaLabel} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <ResultsPerPage view={ResultsPerPageView} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
