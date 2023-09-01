/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { LogExplorerPluginStart } from '@kbn/log-explorer-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import React from 'react';
import { LogExplorerTopNavMenu } from '../../components/log_explorer_top_nav_menu';
import { ObservabilityLogExplorerPageTemplate } from '../../components/page_template';
import { noBreadcrumbs, useBreadcrumbs } from '../../utils/breadcrumbs';

export interface ObservablityLogExplorerMainRouteProps {
  appParams: AppMountParameters;
  core: CoreStart;
  logExplorer: LogExplorerPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  serverless?: ServerlessPluginStart;
}

export const ObservablityLogExplorerMainRoute = ({
  appParams: { history, setHeaderActionMenu, theme$ },
  core,
  logExplorer,
  observabilityShared,
  serverless,
}: ObservablityLogExplorerMainRouteProps) => {
  useBreadcrumbs(noBreadcrumbs, core.chrome, serverless);

  return (
    <>
      <LogExplorerTopNavMenu setHeaderActionMenu={setHeaderActionMenu} theme$={theme$} />
      <ObservabilityLogExplorerPageTemplate observabilityShared={observabilityShared}>
        <logExplorer.LogExplorer scopedHistory={history} />
      </ObservabilityLogExplorerPageTemplate>
    </>
  );
};
