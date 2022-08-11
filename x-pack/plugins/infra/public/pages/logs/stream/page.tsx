/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { useLogsBreadcrumbs } from '../../../hooks/use_logs_breadcrumbs';
import { StreamPageContent } from './page_content';
import { StreamPageHeader } from './page_header';
import { LogsPageProviders } from './page_providers';
import { streamTitle } from '../../../translations';

export const StreamPage = () => {
  useTrackPageview({ app: 'infra_logs', path: 'stream' });
  useTrackPageview({ app: 'infra_logs', path: 'stream', delay: 15000 });

  useLogsBreadcrumbs([
    {
      text: streamTitle,
    },
  ]);
  return (
    <EuiErrorBoundary>
      <LogsPageProviders>
        <StreamPageHeader />
        <StreamPageContent />
      </LogsPageProviders>
    </EuiErrorBoundary>
  );
};
