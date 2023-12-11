/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import React, { useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { LogExplorerTopNavMenu } from '../../components/log_explorer_top_nav_menu';
import { ObservabilityLogExplorerPageTemplate } from '../../components/page_template';
import { noBreadcrumbs, useBreadcrumbs } from '../../utils/breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { ObservabilityLogExplorerAppMountParameters } from '../../types';
import { LazyOriginInterpreter } from '../../state_machines/origin_interpreter/src/lazy_component';
import { createLogExplorerCustomizations } from '../../log_explorer_customizations';
export interface ObservablityLogExplorerMainRouteProps {
  appParams: ObservabilityLogExplorerAppMountParameters;
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

  const customizations = useMemo(() => createLogExplorerCustomizations(), []);

  return (
    <>
      <LogExplorerTopNavMenu
        setHeaderActionMenu={setHeaderActionMenu}
        services={services}
        state$={state$}
        theme$={theme$}
      />
      <LazyOriginInterpreter history={history} toasts={core.notifications.toasts} />
      <ObservabilityLogExplorerPageTemplate observabilityShared={observabilityShared}>
        <logExplorer.LogExplorer
          customizations={customizations}
          scopedHistory={history}
          state$={state$}
        />
      </ObservabilityLogExplorerPageTemplate>
    </>
  );
};
