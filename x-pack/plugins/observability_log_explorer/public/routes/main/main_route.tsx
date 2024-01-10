/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  LogExplorerController,
  LogExplorerPluginStart,
} from '@kbn/log-explorer-plugin/public';
import { useActor } from '@xstate/react';
import React, { useMemo } from 'react';
import { LogExplorerTopNavMenu } from '../../components/log_explorer_top_nav_menu';
import { ObservabilityLogExplorerPageTemplate } from '../../components/page_template';
import { createLogExplorerControllerWithCustomizations } from '../../log_explorer_customizations';
import {
  ObservabilityLogExplorerPageStateProvider,
  useObservabilityLogExplorerPageStateContext,
} from '../../state_machines/observability_log_explorer/src';
import { LazyOriginInterpreter } from '../../state_machines/origin_interpreter/src/lazy_component';
import { ObservabilityLogExplorerHistory } from '../../types';
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
      <ConnectedContent />
    </ObservabilityLogExplorerPageStateProvider>
  );
};

const ConnectedContent = React.memo(() => {
  const {
    services: {
      appParams: { history },
      logExplorer,
    },
  } = useKibanaContextForPlugin();

  const [state] = useActor(useObservabilityLogExplorerPageStateContext());

  if (state.matches('initialized')) {
    return (
      <InitializedContent
        logExplorerController={state.context.controller}
        history={history}
        logExplorer={logExplorer}
      />
    );
  } else {
    return <InitializingContent />;
  }
});

const InitializingContent = React.memo(() => (
  <ObservabilityLogExplorerPageTemplate>
    <EuiEmptyPrompt
      icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
      title={
        <FormattedMessage
          id="xpack.observabilityLogExplorer.InitializingTitle"
          defaultMessage="Initializing the Log Explorer"
        />
      }
    />
  </ObservabilityLogExplorerPageTemplate>
));

const InitializedContent = React.memo(
  ({
    history,
    logExplorer,
    logExplorerController,
  }: {
    history: ObservabilityLogExplorerHistory;
    logExplorer: LogExplorerPluginStart;
    logExplorerController: LogExplorerController;
  }) => {
    return (
      <ObservabilityLogExplorerPageTemplate>
        <logExplorer.LogExplorer controller={logExplorerController} scopedHistory={history} />
      </ObservabilityLogExplorerPageTemplate>
    );
  }
);
