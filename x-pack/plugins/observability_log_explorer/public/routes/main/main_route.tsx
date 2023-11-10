/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core/public';
import { LogExplorerController, LogExplorerPluginStart } from '@kbn/log-explorer-plugin/public';
import { getDevToolsOptions } from '@kbn/xstate-utils/src';
import { useInterpret, useSelector } from '@xstate/react';
import React from 'react';
import { LogExplorerTopNavMenu } from '../../components/log_explorer_top_nav_menu';
import { ObservabilityLogExplorerPageTemplate } from '../../components/page_template';
import {
  createObservabilityLogExplorerStateMachine,
  ObservabilityLogExplorerPageState,
  ObservabilityLogExplorerPageStateProvider,
} from '../../state_machines/observability_log_explorer/src';
import { LazyOriginInterpreter } from '../../state_machines/origin_interpreter/src/lazy_component';
import {
  ObservabilityLogExplorerAppMountParameters,
  ObservabilityLogExplorerHistory,
} from '../../types';
import { noBreadcrumbs, useBreadcrumbs } from '../../utils/breadcrumbs';
import { useKbnUrlStateStorageFromRouterContext } from '../../utils/kbn_url_state_context';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

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

  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  return (
    <ObservabilityLogExplorerPageStateProvider
      createLogExplorerController={logExplorer.createLogExplorerController}
      toasts={core.notifications.toasts}
      urlStateStorageContainer={urlStateStorageContainer}
      timeFilterService={services.data.query.timefilter.timefilter}
    >
      <LogExplorerTopNavMenu
        setHeaderActionMenu={setHeaderActionMenu}
        services={services}
        pageStateService={observabilityLogExplorerService}
        theme$={theme$}
      />
      <LazyOriginInterpreter history={history} toasts={core.notifications.toasts} />
      <ObservabilityLogExplorerMainRouteContent logExplorer={logExplorer} history={history} />
    </ObservabilityLogExplorerPageStateProvider>
  );
  // const observabilityLogExplorerService = useInterpret(
  //   () =>
  //     createObservabilityLogExplorerStateMachine({
  //       toasts: core.notifications.toasts,
  //       urlStateStorageContainer,
  //       createLogExplorerController: logExplorer.createLogExplorerController,
  //       timeFilterService: services.data.query.timefilter.timefilter,
  //     }),
  //   { devTools: getDevToolsOptions() }
  // );

  // const isInitialized = useSelector(observabilityLogExplorerService, (state) =>
  //   state.matches('initialized')
  // );

  // const controller = useSelector(observabilityLogExplorerService, (state) => {
  //   return 'controller' in state.context ? state.context.controller : undefined;
  // });

  return (
    <>
      <LogExplorerTopNavMenu
        setHeaderActionMenu={setHeaderActionMenu}
        services={services}
        pageStateService={observabilityLogExplorerService}
        theme$={theme$}
      />
      <LazyOriginInterpreter history={history} toasts={core.notifications.toasts} />
      <ObservabilityLogExplorerPageTemplate observabilityShared={observabilityShared}>
        {!isInitialized && 'Loading...'}
        {isInitialized && controller && (
          <ObservabilityLogExplorerMainRouteContent
            logExplorer={logExplorer}
            history={history}
            controller={controller}
          />
        )}
      </ObservabilityLogExplorerPageTemplate>
    </>
  );
};

const ObservabilityLogExplorerMainRouteContent = ({
  logExplorer,
  history,
  controller,
}: {
  logExplorer: LogExplorerPluginStart;
  history: ObservabilityLogExplorerHistory;
  controller: LogExplorerController;
}) => {
  return (
    <ObservabilityLogExplorerPageTemplate observabilityShared={observabilityShared}>
      <logExplorer.LogExplorer scopedHistory={history} controller={controller} />;
    </ObservabilityLogExplorerPageTemplate>
  );
};
