/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { I18nStart, ScopedHistory, ApplicationStart } from 'kibana/public';
import { UnmountCallback } from 'src/core/public';

import { init as initBreadcrumbs, SetBreadcrumbs } from './services/breadcrumbs';
import { init as initDocumentation } from './services/documentation_links';
import { App } from './app';
import { ccrStore } from './store';

const renderApp = (
  element: Element,
  I18nContext: I18nStart['Context'],
  history: ScopedHistory,
  getUrlForApp: ApplicationStart['getUrlForApp']
): UnmountCallback => {
  render(
    <I18nContext>
      <Provider store={ccrStore}>
        <App history={history} getUrlForApp={getUrlForApp} />
      </Provider>
    </I18nContext>,
    element
  );

  return () => unmountComponentAtNode(element);
};

export async function mountApp({
  element,
  setBreadcrumbs,
  I18nContext,
  ELASTIC_WEBSITE_URL,
  DOC_LINK_VERSION,
  history,
  getUrlForApp,
}: {
  element: Element;
  setBreadcrumbs: SetBreadcrumbs;
  I18nContext: I18nStart['Context'];
  ELASTIC_WEBSITE_URL: string;
  DOC_LINK_VERSION: string;
  history: ScopedHistory;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}): Promise<UnmountCallback> {
  // Import and initialize additional services here instead of in plugin.ts to reduce the size of the
  // initial bundle as much as possible.
  initBreadcrumbs(setBreadcrumbs);
  initDocumentation(`${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`);

  return renderApp(element, I18nContext, history, getUrlForApp);
}
