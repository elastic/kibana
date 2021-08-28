/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogAnalysisCapabilitiesProvider } from '../../containers/logs/log_analysis/log_analysis_capabilities';
import { LogSourceProvider } from '../../containers/logs/log_source/log_source';
import { useSourceId } from '../../containers/source_id/source_id';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  const [sourceId] = useSourceId();
  const { services } = useKibanaContextForPlugin();
  return (
    <LogSourceProvider
      sourceId={sourceId}
      fetch={services.http.fetch}
      indexPatternsService={services.data.indexPatterns}
    >
      <LogAnalysisCapabilitiesProvider>{children}</LogAnalysisCapabilitiesProvider>
    </LogSourceProvider>
  );
};
