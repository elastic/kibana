/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ColumnarPage } from '../../../components/page';
import { LogEntryRatePageContent } from './page_content';
import { LogEntryRatePageProviders } from './page_providers';

export const LogEntryRatePage = () => {
  return (
    <LogEntryRatePageProviders>
      <ColumnarPage data-test-subj="logsLogEntryRatePage">
        <LogEntryRatePageContent />
      </ColumnarPage>
    </LogEntryRatePageProviders>
  );
};
