/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HttpStart } from 'src/core/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { LogAnalysisCapabilitiesProvider } from '../../containers/logs/log_analysis';
import { LogSourceProvider } from '../../containers/logs/log_source';
import { useSourceId } from '../../containers/source_id';

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  const [sourceId] = useSourceId();
  const { services } = useKibana<{ http: HttpStart }>();
  return (
    <LogSourceProvider sourceId={sourceId} fetch={services.http.fetch}>
      <LogAnalysisCapabilitiesProvider>{children}</LogAnalysisCapabilitiesProvider>
    </LogSourceProvider>
  );
};
