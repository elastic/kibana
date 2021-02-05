/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import React, { ReactNode } from 'react';

import { FlexPage } from './page';

interface LoadingPageProps {
  message?: ReactNode;
  'data-test-subj'?: string;
}

export const LoadingPage = ({
  message,
  'data-test-subj': dataTestSubj = 'loadingPage',
}: LoadingPageProps) => (
  <FlexPage data-test-subj={dataTestSubj}>
    <EuiPageBody>
      <EuiPageContent verticalPosition="center" horizontalPosition="center">
        <EuiFlexGroup alignItems="center" style={{ flexWrap: 'nowrap' }}>
          <EuiLoadingSpinner size="xl" style={{ marginRight: '8px' }} />
          <EuiFlexItem data-test-subj="loadingMessage">{message}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContent>
    </EuiPageBody>
  </FlexPage>
);
