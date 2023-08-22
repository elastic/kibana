/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScopedHistory } from '@kbn/core/public';
import { LogExplorerPluginStart } from '@kbn/log-explorer-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { ObservabilityLogExplorerPageTemplate } from '../../components/page_template';

export interface ObservablityLogExplorerMainRouteProps {
  history: ScopedHistory;
  logExplorer: LogExplorerPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
}

export const ObservablityLogExplorerMainRoute = ({
  history,
  logExplorer,
  observabilityShared,
}: ObservablityLogExplorerMainRouteProps) => (
  <ObservabilityLogExplorerPageTemplate observabilityShared={observabilityShared}>
    <logExplorer.LogExplorer scopedHistory={history} />
  </ObservabilityLogExplorerPageTemplate>
);
