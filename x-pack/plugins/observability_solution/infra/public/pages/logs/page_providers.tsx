/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, FC, PropsWithChildren } from 'react';
import {
  LogViewProvider,
  initializeFromUrl as createInitializeFromUrl,
  updateContextInUrl as createUpdateContextInUrl,
  listenForUrlChanges as createListenForUrlChanges,
} from '@kbn/logs-shared-plugin/public';
import { LogSourcesProvider } from '@kbn/logs-data-access-plugin/public';
import { LogAnalysisCapabilitiesProvider } from '../../containers/logs/log_analysis';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { useKbnUrlStateStorageFromRouterContext } from '../../containers/kbn_url_state_context';

export const LogsPageProviders: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const {
    services: {
      notifications: { toasts: toastsService },
      logsShared,
      logsDataAccess,
    },
  } = useKibanaContextForPlugin();

  const urlStateStorage = useKbnUrlStateStorageFromRouterContext();

  const [initializeFromUrl] = useState(() => {
    return createInitializeFromUrl({ toastsService, urlStateStorage });
  });
  const [updateContextInUrl] = useState(() => {
    return createUpdateContextInUrl({ toastsService, urlStateStorage });
  });
  const [listenForUrlChanges] = useState(() => {
    return createListenForUrlChanges({ urlStateStorage });
  });

  return (
    <LogViewProvider
      logViews={logsShared.logViews.client}
      initializeFromUrl={initializeFromUrl}
      updateContextInUrl={updateContextInUrl}
      listenForUrlChanges={listenForUrlChanges}
    >
      <LogSourcesProvider logSourcesService={logsDataAccess.services.logSourcesService}>
        <LogAnalysisCapabilitiesProvider>{children}</LogAnalysisCapabilitiesProvider>
      </LogSourcesProvider>
    </LogViewProvider>
  );
};
