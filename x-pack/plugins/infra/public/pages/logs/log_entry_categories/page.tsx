/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { ColumnarPage } from '../../../components/page';
import { LogEntryCategoriesPageContent } from './page_content';
import { LogEntryCategoriesPageProviders } from './page_providers';

export const LogEntryCategoriesPage = () => {
  return (
    <EuiErrorBoundary>
      <LogEntryCategoriesPageProviders>
        <ColumnarPage data-test-subj="logsLogEntryCategoriesPage">
          <LogEntryCategoriesPageContent />
        </ColumnarPage>
      </LogEntryCategoriesPageProviders>
    </EuiErrorBoundary>
  );
};
