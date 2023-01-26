/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import React from 'react';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useLogsBreadcrumbs } from '../../../hooks/use_logs_breadcrumbs';
import { useLogViewContext } from '../../../hooks/use_log_view';
import { LogStreamPageStateProvider } from '../../../observability_logs/log_stream_page/state';
import { streamTitle } from '../../../translations';
import { useKbnUrlStateStorageFromRouterContext } from '../../../utils/kbn_url_state_context';
import { useKibanaQuerySettings } from '../../../utils/use_kibana_query_settings';
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
        query: { queryString: queryStringService, filterManager: filterManagerService },
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
      >
        <ConnectedStreamPageContentMemo />
      </LogStreamPageStateProvider>
    </EuiErrorBoundary>
  );
};

const ConnectedStreamPageContentMemo = React.memo(ConnectedStreamPageContent);
