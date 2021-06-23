/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { PageTemplate } from './page_template';

interface LoadingPageProps {
  message?: ReactNode;
  'data-test-subj'?: string;
}

// Represents a fully constructed page, including page template.
export const LoadingPage = ({
  message,
  'data-test-subj': dataTestSubj = 'loadingPage',
}: LoadingPageProps) => {
  return (
    <PageTemplate isEmptyState={true} data-test-subj={dataTestSubj}>
      <LoadingPrompt message={message} />
    </PageTemplate>
  );
};

export const LoadingPrompt = ({ message }: LoadingPageProps) => {
  return (
    <EuiEmptyPrompt
      body={
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" style={{ marginRight: '8px' }} />
          </EuiFlexItem>
          <EuiFlexItem>{message}</EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};
