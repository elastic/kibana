/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { ConnectedLogExplorerPage } from '../../components/log_explorer_page';
import { LogExplorerTopNavMenu } from '../../components/log_explorer_page/log_explorer_top_nav_menu';
import { createLogExplorerControllerWithCustomizations } from '../../log_explorer_customizations';
import { ObservabilityLogExplorerPageStateProvider } from '../../state_machines/observability_log_explorer/src';
import { LazyOriginInterpreter } from '../../state_machines/origin_interpreter/src/lazy_component';
import { noBreadcrumbs, useBreadcrumbs } from '../../utils/breadcrumbs';
import { useKbnUrlStateStorageFromRouterContext } from '../../utils/kbn_url_state_context';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

export const ObservabilityLogExplorerMainRoute = () => {
  const { services } = useKibanaContextForPlugin();
  const { logExplorer, serverless, chrome, notifications, appParams } = services;
  const { history } = appParams;

  useBreadcrumbs(noBreadcrumbs, chrome, serverless);

  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  const createLogExplorerController = useMemo(
    () => createLogExplorerControllerWithCustomizations(logExplorer.createLogExplorerController),
    [logExplorer.createLogExplorerController]
  );

  return (
    <ObservabilityLogExplorerPageStateProvider
      createLogExplorerController={createLogExplorerController}
      toasts={notifications.toasts}
      urlStateStorageContainer={urlStateStorageContainer}
      timeFilterService={services.data.query.timefilter.timefilter}
    >
      <LogExplorerTopNavMenu />
      <LazyOriginInterpreter history={history} toasts={notifications.toasts} />
      <ConnectedLogExplorerPage />
    </ObservabilityLogExplorerPageStateProvider>
  );
};
