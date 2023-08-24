/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, ScopedHistory } from '@kbn/core/public';
import { LogExplorerPluginStart } from '@kbn/log-explorer-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import React from 'react';
import { ObservabilityLogExplorerPageTemplate } from '../../components/page_template';
import { noBreadcrumbs, useBreadcrumbs } from '../../utils/breadcrumbs';

export interface ObservablityLogExplorerMainRouteProps {
  core: CoreStart;
  history: ScopedHistory;
  logExplorer: LogExplorerPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  serverless?: ServerlessPluginStart;
}

export const ObservablityLogExplorerMainRoute = ({
  core,
  history,
  logExplorer,
  observabilityShared,
  serverless,
}: ObservablityLogExplorerMainRouteProps) => {
  useBreadcrumbs(noBreadcrumbs, core.chrome, serverless);

  return (
    <ObservabilityLogExplorerPageTemplate observabilityShared={observabilityShared}>
      <logExplorer.LogExplorer scopedHistory={history} />
    </ObservabilityLogExplorerPageTemplate>
  );
};
