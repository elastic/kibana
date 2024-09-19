/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useLogsBreadcrumbs } from '../../../hooks/use_logs_breadcrumbs';
import { LogEntryCategoriesPageContent } from './page_content';
import { LogEntryCategoriesPageProviders } from './page_providers';
import { logCategoriesTitle } from '../../../translations';

export const LogEntryCategoriesPage = () => {
  useLogsBreadcrumbs([
    {
      text: logCategoriesTitle,
    },
  ]);

  return (
    <EuiErrorBoundary>
      <LogEntryCategoriesPageProviders>
        <LogEntryCategoriesPageContent />
      </LogEntryCategoriesPageProviders>
    </EuiErrorBoundary>
  );
};
