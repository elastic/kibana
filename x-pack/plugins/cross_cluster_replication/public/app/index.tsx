/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';

import {
  UnmountCallback,
  ScopedHistory,
  ApplicationStart,
  DocLinksStart,
  ExecutionContextStart,
  CoreStart,
} from '@kbn/core/public';
import { KibanaRenderContextProvider, useExecutionContext } from '../shared_imports';
import { init as initBreadcrumbs, SetBreadcrumbs } from './services/breadcrumbs';
import { init as initDocumentation } from './services/documentation_links';
import { App } from './app';
import { ccrStore } from './store';

type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;

const AppWithExecutionContext = ({
  history,
  executionContext,
  getUrlForApp,
}: {
  history: ScopedHistory;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  executionContext: ExecutionContextStart;
}) => {
  useExecutionContext(executionContext, {
    type: 'application',
    page: 'crossClusterReplication',
  });

  return <App history={history} getUrlForApp={getUrlForApp} />;
};

const renderApp = (
  startServices: StartServices,
  element: Element,
  history: ScopedHistory,
  getUrlForApp: ApplicationStart['getUrlForApp'],
  executionContext: ExecutionContextStart
): UnmountCallback => {
  render(
    <KibanaRenderContextProvider {...startServices}>
      <Provider store={ccrStore}>
        <AppWithExecutionContext
          history={history}
          getUrlForApp={getUrlForApp}
          executionContext={executionContext}
        />
      </Provider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => unmountComponentAtNode(element);
};

export async function mountApp({
  startServices,
  element,
  setBreadcrumbs,
  docLinks,
  history,
  getUrlForApp,
  executionContext,
}: {
  startServices: StartServices;
  element: Element;
  setBreadcrumbs: SetBreadcrumbs;
  docLinks: DocLinksStart;
  history: ScopedHistory;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  executionContext: ExecutionContextStart;
}): Promise<UnmountCallback> {
  // Import and initialize additional services here instead of in plugin.ts to reduce the size of the
  // initial bundle as much as possible.
  initBreadcrumbs(setBreadcrumbs);
  initDocumentation(docLinks);

  return renderApp(startServices, element, history, getUrlForApp, executionContext);
}
