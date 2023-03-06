/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogAnalysisCapabilitiesProvider } from '../../containers/logs/log_analysis';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { LogViewProvider } from '../../hooks/use_log_view';

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  const { services } = useKibanaContextForPlugin();

  return (
    <LogViewProvider logViews={services.logViews.client}>
      <LogAnalysisCapabilitiesProvider>{children}</LogAnalysisCapabilitiesProvider>
    </LogViewProvider>
  );
};
