/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogAnalysisCapabilitiesProvider } from '../../containers/logs/log_analysis';
import { useSourceId } from '../../containers/source_id';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { LogViewProvider } from '../../hooks/use_log_view';

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  const [sourceId] = useSourceId();
  const { services } = useKibanaContextForPlugin();
  return (
    <LogViewProvider
      fetch={services.http.fetch}
      logViewId={sourceId}
      logViews={services.logViews.client}
    >
      <LogAnalysisCapabilitiesProvider>{children}</LogAnalysisCapabilitiesProvider>
    </LogViewProvider>
  );
};
