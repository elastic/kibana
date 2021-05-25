/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogSourceErrorPage } from '../../../components/logging/log_source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { LogsPageLogsContent } from './page_logs_content';
import { LogsPageNoIndicesContent } from './page_no_indices_content';

export const StreamPageContent: React.FunctionComponent = () => {
  const {
    hasFailedLoading,
    isLoading,
    isUninitialized,
    loadSource,
    latestLoadSourceFailures,
    sourceStatus,
  } = useLogSourceContext();

  if (isLoading || isUninitialized) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoading) {
    return <LogSourceErrorPage errors={latestLoadSourceFailures} onRetry={loadSource} />;
  } else if (sourceStatus?.logIndexStatus !== 'missing') {
    return <LogsPageLogsContent />;
  } else {
    return <LogsPageNoIndicesContent />;
  }
};
