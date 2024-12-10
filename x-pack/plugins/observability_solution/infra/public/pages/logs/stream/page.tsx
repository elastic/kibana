/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { useKibanaQuerySettings, useTrackPageview } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useLogViewContext } from '@kbn/logs-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useLogsBreadcrumbs } from '../../../hooks/use_logs_breadcrumbs';
import { LogStreamPageStateProvider } from '../../../observability_logs/log_stream_page/state';
import { streamTitle } from '../../../translations';
import { useKbnUrlStateStorageFromRouterContext } from '../../../containers/kbn_url_state_context';
import { ConnectedStreamPageContent } from './page_content';

export const StreamPage = () => {
  useTrackPageview({ app: 'infra_logs', path: 'stream' });
  useTrackPageview({ app: 'infra_logs', path: 'stream', delay: 15000 });

  useLogsBreadcrumbs([
    {
      text: streamTitle,
    },
  ]);

  const { logViewStateNotifications } = useLogViewContext();
  const {
    services: {
      data: {
        query: {
          queryString: queryStringService,
          filterManager: filterManagerService,
          timefilter: { timefilter: timeFilterService },
        },
      },
      notifications: { toasts: toastsService },
    },
  } = useKibanaContextForPlugin();

  const kibanaQuerySettings = useKibanaQuerySettings();
  const urlStateStorage = useKbnUrlStateStorageFromRouterContext();

  return (
    <EuiErrorBoundary>
      <LogStreamPageStateProvider
        kibanaQuerySettings={kibanaQuerySettings}
        logViewStateNotifications={logViewStateNotifications}
        queryStringService={queryStringService}
        toastsService={toastsService}
        filterManagerService={filterManagerService}
        urlStateStorage={urlStateStorage}
        timeFilterService={timeFilterService}
      >
        <ConnectedStreamPageContentMemo />
      </LogStreamPageStateProvider>
    </EuiErrorBoundary>
  );
};

const ConnectedStreamPageContentMemo = React.memo(ConnectedStreamPageContent);
