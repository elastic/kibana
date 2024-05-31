/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import { OBSERVABILITY_LOGS_EXPLORER_APP_ID } from '@kbn/deeplinks-observability';
import { AppMountParameters, CoreStart } from '@kbn/core/public';

export const renderObservabilityLogsExplorerRedirect = (
  core: CoreStart,
  appParams: AppMountParameters
) => {
  ReactDOM.render(
    <Router history={appParams.history}>
      <ObservabilityLogsExplorerRedirect core={core} />
    </Router>,
    appParams.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(appParams.element);
  };
};

export const ObservabilityLogsExplorerRedirect = ({ core }: { core: CoreStart }) => {
  const location = useLocation();
  const path = `${location.pathname}${location.search}`;
  core.application.navigateToApp(OBSERVABILITY_LOGS_EXPLORER_APP_ID, { replace: true, path });
  return <></>;
};
