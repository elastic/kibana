/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LogAnalysisCapabilitiesProvider } from '../../containers/logs/log_analysis';
import { SourceProvider } from '../../containers/source';
import { useSourceId } from '../../containers/source_id';

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  const [sourceId] = useSourceId();

  return (
    <SourceProvider sourceId={sourceId}>
      <LogAnalysisCapabilitiesProvider>{children}</LogAnalysisCapabilitiesProvider>
    </SourceProvider>
  );
};
