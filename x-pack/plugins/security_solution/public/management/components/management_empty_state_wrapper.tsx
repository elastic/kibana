/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiPageTemplate } from '@elastic/eui';
import styled from 'styled-components';

export const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  min-height: calc(100vh - 140px);
`;

export const ManagementEmptyStateWrapper = memo(({ children }) => {
  return (
    <StyledEuiFlexGroup direction="column" alignItems="center">
      <EuiPageTemplate template="centeredContent">{children}</EuiPageTemplate>
    </StyledEuiFlexGroup>
  );
});

ManagementEmptyStateWrapper.displayName = 'ManagementEmptyStateWrapper';
