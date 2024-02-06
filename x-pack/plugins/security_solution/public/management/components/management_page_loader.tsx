/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { ManagementEmptyStateWrapper } from './management_empty_state_wrapper';

export const ManagementPageLoader = memo<{ 'data-test-subj'?: string; classname?: string }>(
  ({ 'data-test-subj': dataTestSubj, classname }) => {
    return (
      <ManagementEmptyStateWrapper>
        <EuiLoadingSpinner data-test-subj={dataTestSubj} size="l" className={classname} />
      </ManagementEmptyStateWrapper>
    );
  }
);

ManagementPageLoader.displayName = 'ManagementPageLoader';
