/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

interface LoadingPageProps {
  message?: string;
}

export const LoadingPage = ({ message }: LoadingPageProps) => (
  <FlexPage>
    <EuiPageBody>
      <EuiPageContent verticalPosition="center" horizontalPosition="center">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
          <EuiFlexItem>{message}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContent>
    </EuiPageBody>
  </FlexPage>
);

const FlexPage = styled(EuiPage)`
  flex: 1 0 0;
`;

// const InlineMessage = styled.div`
//   display: flex;
//   flex-direction: row;
//   align-items: center;
// `;

// const MessageText = styled.div`
//   padding: ${props => props.theme.eui.euiSizeM};
//   display: inline-block;
// `;
