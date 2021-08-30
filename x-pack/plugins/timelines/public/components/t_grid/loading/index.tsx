/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { FullWidthFlexGroup } from '../styles';

export const TGridLoading: React.FC = () => {
  return (
    <FullWidthFlexGroup
      $color="subdued"
      alignItems="center"
      justifyContent="center"
      data-test-subj="loading-alerts-panel"
    >
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </FullWidthFlexGroup>
  );
};
