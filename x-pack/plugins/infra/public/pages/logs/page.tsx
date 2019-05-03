/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ColumnarPage } from '../../components/page';
import { LogsPageContent } from './page_content';
import { LogsPageHeader } from './page_header';
import { LogsPageProviders } from './page_providers';

export const LogsPage = () => (
  <LogsPageProviders>
    <ColumnarPage data-test-subj="infraLogsPage">
      <LogsPageHeader />
      <LogsPageContent />
    </ColumnarPage>
  </LogsPageProviders>
);
