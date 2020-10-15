/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { LogsPageContent } from './page_content';
import { LogsPageProviders } from './page_providers';

export const LogsPage: React.FunctionComponent<RouteComponentProps> = () => {
  return (
    <EuiErrorBoundary>
      <LogsPageProviders>
        <LogsPageContent />
      </LogsPageProviders>
    </EuiErrorBoundary>
  );
};
