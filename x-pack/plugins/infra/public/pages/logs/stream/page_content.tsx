/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LogSourceErrorPage } from '../../../components/logging/log_source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { LogsPageLogsContent } from './page_logs_content';
import { LogsPageNoIndicesContent } from './page_no_indices_content';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

const streamTitle = i18n.translate('xpack.infra.logs.streamPageTitle', {
  defaultMessage: 'Stream',
});

export const StreamPageContent: React.FunctionComponent = () => {
  const {
    hasFailedLoading,
    isLoading,
    isUninitialized,
    loadSource,
    latestLoadSourceFailures,
    sourceStatus,
  } = useLogSourceContext();

  const {
    services: {
      observability: {
        navigation: { PageTemplate },
      },
    },
  } = useKibanaContextForPlugin();

  if (isLoading || isUninitialized) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoading) {
    return <LogSourceErrorPage errors={latestLoadSourceFailures} onRetry={loadSource} />;
  } else if (sourceStatus?.logIndexStatus !== 'missing') {
    return (
      <PageTemplate
        pageHeader={{
          pageTitle: streamTitle,
        }}
      >
        <LogsPageLogsContent />
      </PageTemplate>
    );
  } else {
    return <LogsPageNoIndicesContent />;
  }
};
