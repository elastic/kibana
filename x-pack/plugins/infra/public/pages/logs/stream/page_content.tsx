/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { WithMachine } from '../../../observability_logs/log_stream_page/state/src/provider';
import { LogSourceErrorPage } from '../../../components/logging/log_source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { LogsPageTemplate } from '../page_template';
import { LogsPageLogsContent } from './page_logs_content';
import { fullHeightContentStyles } from '../../../page_template.styles';

const streamTitle = i18n.translate('xpack.infra.logs.streamPageTitle', {
  defaultMessage: 'Stream',
});

export const StreamPageContent: React.FunctionComponent = ({
  machine: logStreamPageStateMachine,
}) => {
  const isLoading = useSelector(
    logStreamPageStateMachine,
    (state) => state.matches('uninitialized') || state.matches('loadingLogView')
  );

  const hasFailedLoading = useSelector(logStreamPageStateMachine, (state) =>
    state.matches('loadingLogViewFailed')
  );

  const hasIndices = useSelector(logStreamPageStateMachine, (state) =>
    state.matches('hasLogViewIndices')
  );

  const missingIndices = useSelector(logStreamPageStateMachine, (state) =>
    state.matches('missingLogViewIndices')
  );

  const logViewErrors = useSelector(logStreamPageStateMachine, (state) => [
    state.context.logViewError,
  ]);

  if (isLoading) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoading) {
    return <LogSourceErrorPage errors={logViewErrors} onRetry={load} />;
  } else if (missingIndices) {
    return (
      <div className={APP_WRAPPER_CLASS}>
        <LogsPageTemplate
          hasData={false}
          isDataLoading={false}
          pageHeader={{
            pageTitle: streamTitle,
          }}
          pageSectionProps={{
            contentProps: {
              css: fullHeightContentStyles,
            },
          }}
        >
          <LogsPageLogsContent />
        </LogsPageTemplate>
      </div>
    );
  } else if (hasIndices) {
    return (
      <div className={APP_WRAPPER_CLASS}>
        <LogsPageTemplate
          hasData={true}
          isDataLoading={false}
          pageHeader={{
            pageTitle: streamTitle,
          }}
          pageSectionProps={{
            contentProps: {
              css: fullHeightContentStyles,
            },
          }}
        >
          <LogsPageLogsContent />
        </LogsPageTemplate>
      </div>
    );
  }
};

export const ConnectedStreamPageContent = WithMachine(StreamPageContent);
