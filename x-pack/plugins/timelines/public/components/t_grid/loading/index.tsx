/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

const heights = {
  tall: 490,
  short: 250,
};

export const TGridLoading: React.FC<{ height?: keyof typeof heights }> = ({ height = 'tall' }) => {
  return (
    <EuiPanel color="subdued">
      <EuiFlexGroup
        style={{ height: heights[height] }}
        alignItems="center"
        justifyContent="center"
        data-test-subj="loading-alerts-panel"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
