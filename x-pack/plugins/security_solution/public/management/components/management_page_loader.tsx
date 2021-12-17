/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { ManagementEmptyStateWraper } from './management_empty_state_wraper';

export const ManagementPageLoader = memo<{ 'data-test-subj': string }>(
  ({ 'data-test-subj': dataTestSubj }) => {
    return (
      <ManagementEmptyStateWraper>
        <EuiLoadingSpinner data-test-subj={dataTestSubj} size="l" />
      </ManagementEmptyStateWraper>
    );
  }
);

ManagementPageLoader.displayName = 'ManagementPageLoader';
