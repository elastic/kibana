/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';

export const cspLoadingStateTestId = 'csp_loading_state';

export const CspLoadingState: React.FunctionComponent = ({ children }) => (
  <EuiFlexGroup direction="column" alignItems="center" data-test-subj={cspLoadingStateTestId}>
    <EuiFlexItem>
      <EuiLoadingSpinner size="xl" />
    </EuiFlexItem>
    <EuiFlexItem>{children}</EuiFlexItem>
  </EuiFlexGroup>
);
