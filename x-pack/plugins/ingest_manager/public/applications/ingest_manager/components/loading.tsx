/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { EuiLoadingSpinnerSize } from '@elastic/eui/src/components/loading/loading_spinner';

export const Loading: React.FunctionComponent<{ size?: EuiLoadingSpinnerSize }> = ({ size }) => (
  <EuiFlexGroup justifyContent="spaceAround">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size={size || 'xl'} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
