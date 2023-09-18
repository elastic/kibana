/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import React, { useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { LogExplorerTopNavMenu } from '../../components/log_explorer_top_nav_menu';
import { ObservabilityLogExplorerPageTemplate } from '../../components/page_template';
import { noBreadcrumbs, useBreadcrumbs } from '../../utils/breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

export interface ObservablityLogExplorerMainRouteProps {
  appParams: AppMountParameters;
  core: CoreStart;
}

export const ObservablityLogExplorerMainRoute = ({
  appParams,
  core,
}: ObservablityLogExplorerMainRouteProps) => {
  const { services } = useKibanaContextForPlugin();
  const { logExplorer, observabilityShared, serverless } = services;
  useBreadcrumbs(noBreadcrumbs, core.chrome, serverless);

  const { history, setHeaderActionMenu, theme$ } = appParams;

  const [state$] = useState(() => new BehaviorSubject({}));

  return (
    <>
      <LogExplorerTopNavMenu
        setHeaderActionMenu={setHeaderActionMenu}
        services={services}
        state$={state$}
        theme$={theme$}
      />
      <ObservabilityLogExplorerPageTemplate observabilityShared={observabilityShared}>
        <logExplorer.LogExplorer scopedHistory={history} state$={state$} />
      </ObservabilityLogExplorerPageTemplate>
    </>
  );
};
