/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useInterpret, useSelector } from '@xstate/react';
import { CoreStart } from '@kbn/core/public';
import React, { useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { isDevMode } from '@kbn/xstate-utils';
import { LogExplorerController, LogExplorerPluginStart } from '@kbn/log-explorer-plugin/public';
import { getDevToolsOptions } from '@kbn/xstate-utils/src';
import { LogExplorerTopNavMenu } from '../../components/log_explorer_top_nav_menu';
import { ObservabilityLogExplorerPageTemplate } from '../../components/page_template';
import { noBreadcrumbs, useBreadcrumbs } from '../../utils/breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import {
  ObservabilityLogExplorerAppMountParameters,
  ObservabilityLogExplorerHistory,
} from '../../types';
import { LazyOriginInterpreter } from '../../state_machines/origin_interpreter/src/lazy_component';
import { createObservabilityLogExplorerStateMachine } from '../../state_machines/observability_log_explorer/src/state_machine';
import { useKbnUrlStateStorageFromRouterContext } from '../../utils/kbn_url_state_context';

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

  const [state$] = useState(() => new BehaviorSubject({})); // TODO: Refactor the use of this observable
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  const ObservabilityLogExplorerService = useInterpret(
    () =>
      createObservabilityLogExplorerStateMachine({
        toasts: core.notifications.toasts,
        urlStateStorageContainer,
        createLogExplorerController: logExplorer.createLogExplorerController,
        timeFilterService: services.data.query.timefilter.timefilter,
      }),
    { devTools: getDevToolsOptions() }
  );

  const isInitialized = useSelector(ObservabilityLogExplorerService, (state) =>
    state.matches('initialized')
  );

  const controller = useSelector(ObservabilityLogExplorerService, (state) => {
    return 'controller' in state.context ? state.context.controller : undefined;
  });

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
        {!isInitialized && 'Loading...'}
        {isInitialized && controller && (
          <ObservabilityLogExplorerMainRouteContent
            logExplorer={logExplorer}
            history={history}
            controller={controller}
            state$={state$}
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
  state$,
}: {
  logExplorer: LogExplorerPluginStart;
  history: ObservabilityLogExplorerHistory;
  controller: LogExplorerController;
  state$: BehaviorSubject<unknown>; // TODO: Refactor the use of this observable
}) => {
  return (
    <logExplorer.LogExplorer scopedHistory={history} state$={state$} controller={controller} />
  );
};
