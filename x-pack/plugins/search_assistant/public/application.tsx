/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { SearchAssistantPluginStartDependencies } from './types';
import { SearchAssistantRouter } from './components/routes/router';

export const renderApp = (
  core: CoreStart,
  services: SearchAssistantPluginStartDependencies,
  appMountParameters: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <I18nProvider>
          <SearchAssistantRouter history={appMountParameters.history} />
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    appMountParameters.element
  );

  return () => ReactDOM.unmountComponentAtNode(appMountParameters.element);
};
