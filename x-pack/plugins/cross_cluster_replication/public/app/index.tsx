/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { Observable } from 'rxjs';

import {
  UnmountCallback,
  I18nStart,
  ScopedHistory,
  ApplicationStart,
  DocLinksStart,
  CoreTheme,
  ExecutionContextStart,
} from 'src/core/public';
import { KibanaThemeProvider, useExecutionContext } from '../shared_imports';
import { init as initBreadcrumbs, SetBreadcrumbs } from './services/breadcrumbs';
import { init as initDocumentation } from './services/documentation_links';
import { App } from './app';
import { ccrStore } from './store';

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
  element: Element,
  I18nContext: I18nStart['Context'],
  history: ScopedHistory,
  getUrlForApp: ApplicationStart['getUrlForApp'],
  theme$: Observable<CoreTheme>,
  executionContext: ExecutionContextStart
): UnmountCallback => {
  render(
    <I18nContext>
      <KibanaThemeProvider theme$={theme$}>
        <Provider store={ccrStore}>
          <AppWithExecutionContext
            history={history}
            getUrlForApp={getUrlForApp}
            executionContext={executionContext}
          />
        </Provider>
      </KibanaThemeProvider>
    </I18nContext>,
    element
  );

  return () => unmountComponentAtNode(element);
};

export async function mountApp({
  element,
  setBreadcrumbs,
  I18nContext,
  docLinks,
  history,
  getUrlForApp,
  theme$,
  executionContext,
}: {
  element: Element;
  setBreadcrumbs: SetBreadcrumbs;
  I18nContext: I18nStart['Context'];
  docLinks: DocLinksStart;
  history: ScopedHistory;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  theme$: Observable<CoreTheme>;
  executionContext: ExecutionContextStart;
}): Promise<UnmountCallback> {
  // Import and initialize additional services here instead of in plugin.ts to reduce the size of the
  // initial bundle as much as possible.
  initBreadcrumbs(setBreadcrumbs);
  initDocumentation(docLinks);

  return renderApp(element, I18nContext, history, getUrlForApp, theme$, executionContext);
}
