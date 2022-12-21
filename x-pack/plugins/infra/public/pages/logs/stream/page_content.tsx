/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useSelector } from '@xstate/react';
import React from 'react';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useLogStreamPageStateContext } from '../../../observability_logs/log_stream_page/state/src/provider';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { ConnectedLogViewErrorPage } from '../shared/page_log_view_error';
import { LogsPageTemplate } from '../shared/page_template';
import { LogsPageLogsContent } from './page_logs_content';
import { LogStreamPageContentProviders } from './page_providers';

const streamTitle = i18n.translate('xpack.infra.logs.streamPageTitle', {
  defaultMessage: 'Stream',
});

interface InjectedProps {
  isLoading: boolean;
  hasFailedLoading: boolean;
  hasIndices: boolean;
  missingIndices: boolean;
}

export const ConnectedStreamPageContent: React.FC = () => {
  const logStreamPageStateService = useLogStreamPageStateContext();

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

  return (
    <StreamPageContent
      isLoading={isLoading}
      hasFailedLoading={hasFailedLoading}
      hasIndices={hasIndices}
      missingIndices={missingIndices}
    />
  );
};

export const StreamPageContent: React.FC<InjectedProps> = (props: InjectedProps) => {
  const { isLoading, hasFailedLoading, hasIndices, missingIndices } = props;

  if (isLoading) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoading) {
    return <ConnectedLogViewErrorPage />;
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
        />
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
          <LogStreamPageContentProviders>
            <LogsPageLogsContent />
          </LogStreamPageContentProviders>
        </LogsPageTemplate>
      </div>
    );
  } else {
    return null;
  }
};
