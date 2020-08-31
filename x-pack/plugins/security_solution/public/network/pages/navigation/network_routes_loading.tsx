/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { EuiFlexItem, EuiLoadingSpinner, EuiFlexGroup } from '@elastic/eui';

const FlexGroup = styled(EuiFlexGroup)`
  min-height: 200px;
`;

FlexGroup.displayName = 'FlexGroup';

export const NetworkRoutesLoading = () => (
  <FlexGroup justifyContent="center" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="xl" />
    </EuiFlexItem>
  </FlexGroup>
);

NetworkRoutesLoading.displayName = 'NetworkRoutesLoading';
