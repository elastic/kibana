/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import React from 'react';

import { FlexPage } from './page';

interface LoadingPageProps {
  message?: string | JSX.Element;
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
