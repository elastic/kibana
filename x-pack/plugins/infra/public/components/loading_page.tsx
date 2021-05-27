/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

interface LoadingPageProps {
  message?: ReactNode;
  'data-test-subj'?: string;
}

export const LoadingPage = ({
  message,
  'data-test-subj': dataTestSubj = 'loadingPage',
}: LoadingPageProps) => {
  const {
    services: {
      observability: {
        navigation: { PageTemplate },
      },
    },
  } = useKibanaContextForPlugin();

  return (
    <PageTemplate isEmptyState={true}>
      <EuiEmptyPrompt
        body={
          <>
            <EuiLoadingSpinner size="xl" style={{ marginRight: '8px' }} />
            {message}
          </>
        }
      />
    </PageTemplate>
  );
};
