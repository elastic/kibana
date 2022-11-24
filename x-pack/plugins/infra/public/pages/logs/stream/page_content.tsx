/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useContext } from 'react';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { LogStreamPageStateContext } from '../../../observability_logs/log_stream_page/state/src/provider';
import { LogSourceErrorPage } from '../../../components/logging/log_source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { LogsPageTemplate } from '../page_template';
import { LogsPageLogsContent } from './page_logs_content';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { LogsPageContentProviders } from './page_providers';

const streamTitle = i18n.translate('xpack.infra.logs.streamPageTitle', {
  defaultMessage: 'Stream',
});

interface InjectedProps {
  isLoading: boolean;
  hasFailedLoading: boolean;
  hasIndices: boolean;
  missingIndices: boolean;
  logViewErrors: Error[];
  retry: () => void;
}

export const ConnectedStreamPageContent: React.FC = () => {
  const { logStreamPageStateService } = useContext(LogStreamPageStateContext);

  const isLoading = useSelector(logStreamPageStateService, (state) => {
    return state.matches('uninitialized') || state.matches('loadingLogView');
  });

  const hasFailedLoading = useSelector(logStreamPageStateService, (state) =>
    state.matches('loadingLogViewFailed')
  );

  const hasIndices = useSelector(logStreamPageStateService, (state) =>
    state.matches('hasLogViewIndices')
  );

  const missingIndices = useSelector(logStreamPageStateService, (state) =>
    state.matches('missingLogViewIndices')
  );

  const logViewErrors = useSelector(logStreamPageStateService, (state) => {
    return state.matches('loadingLogViewFailed')
      ? 'error' in state.context.logViewMachineRef.getSnapshot()?.context
        ? [state.context.logViewMachineRef.getSnapshot()?.context.error]
        : []
      : [];
  });

  const retry = useCallback(() => {
    logStreamPageStateService.getSnapshot().context.logViewMachineRef.send({
      type: 'retry',
    });
  }, [logStreamPageStateService]);

  return (
    <StreamPageContent
      isLoading={isLoading}
      hasFailedLoading={hasFailedLoading}
      hasIndices={hasIndices}
      missingIndices={missingIndices}
      logViewErrors={logViewErrors}
      retry={retry}
    />
  );
};

export const StreamPageContent: React.FC<InjectedProps> = (props: InjectedProps) => {
  const { isLoading, hasFailedLoading, logViewErrors, hasIndices, missingIndices, retry } = props;

  if (isLoading) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoading) {
    return <LogSourceErrorPage errors={logViewErrors} onRetry={retry} />;
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
          <LogsPageContentProviders>
            <LogsPageLogsContent />
          </LogsPageContentProviders>
        </LogsPageTemplate>
      </div>
    );
  } else {
    return null;
  }
};
