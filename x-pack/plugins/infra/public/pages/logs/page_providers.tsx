/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { LogAnalysisCapabilitiesProvider } from '../../containers/logs/log_analysis';
import { LogSourceProvider } from '../../containers/logs/log_source';
import { useSourceId } from '../../containers/source_id';

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
