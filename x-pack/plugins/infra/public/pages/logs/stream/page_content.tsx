/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { css } from '@emotion/react';
import { LogSourceErrorPage } from '../../../components/logging/log_source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useLogViewContext } from '../../../hooks/use_log_view';
import { LogsPageTemplate } from '../page_template';
import { LogsPageLogsContent } from './page_logs_content';

const streamTitle = i18n.translate('xpack.infra.logs.streamPageTitle', {
  defaultMessage: 'Stream',
});

export const StreamPageContent: React.FunctionComponent = () => {
  const {
    hasFailedLoading,
    isLoading,
    isUninitialized,
    latestLoadLogViewFailures,
    load,
    logViewStatus,
  } = useLogViewContext();

  if (isLoading || isUninitialized) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoading) {
    return <LogSourceErrorPage errors={latestLoadLogViewFailures} onRetry={load} />;
  } else {
    return (
      <div className={APP_WRAPPER_CLASS}>
        <LogsPageTemplate
          hasData={logViewStatus?.index !== 'missing'}
          isDataLoading={isLoading}
          pageHeader={{
            pageTitle: streamTitle,
          }}
          pageSectionProps={{
            contentProps: {
              // This is added to facilitate a full height layout whereby the
              // inner container will set its own height and be scrollable.
              css: css`
                display: flex;
                flex-direction: column;
                flex: 1 0 auto;
                width: 100%;
                height: 100%;
              `,
            },
          }}
        >
          <LogsPageLogsContent />
        </LogsPageTemplate>
      </div>
    );
  }
};
