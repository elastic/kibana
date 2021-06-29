/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { LogEntryRatePageContent } from './page_content';
import { LogEntryRatePageProviders } from './page_providers';

export const LogEntryRatePage = () => {
  return (
    <EuiErrorBoundary>
      <LogEntryRatePageProviders>
        <LogEntryRatePageContent />
      </LogEntryRatePageProviders>
    </EuiErrorBoundary>
  );
};
