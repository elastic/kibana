/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSkeletonText } from '@elastic/eui';
import { uncategorizedLabel } from '../constants';

export const DatasetSkeleton = () => (
  <EuiPanel data-test-subj="dataSourceSelectorSkeleton">
    <EuiSkeletonText lines={7} isLoading contentAriaLabel={uncategorizedLabel} />
  </EuiPanel>
);
