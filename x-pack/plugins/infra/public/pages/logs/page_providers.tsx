/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { LogAnalysisCapabilitiesProvider } from '../../containers/logs/log_analysis';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { LogViewProvider } from '../../hooks/use_log_view';
import {
  initializeFromUrl as createInitializeFromUrl,
  updateContextInUrl as createUpdateContextInUrl,
  listenForUrlChanges as createListenForUrlChanges,
} from '../../observability_logs/log_view_state/src/url_state_storage_service';
import { useKbnUrlStateStorageFromRouterContext } from '../../utils/kbn_url_state_context';

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  const {
    services: {
      notifications: { toasts: toastsService },
      logViews: { client },
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
      logViews={client}
      initializeFromUrl={initializeFromUrl}
      updateContextInUrl={updateContextInUrl}
      listenForUrlChanges={listenForUrlChanges}
    >
      <LogAnalysisCapabilitiesProvider>{children}</LogAnalysisCapabilitiesProvider>
    </LogViewProvider>
  );
};
