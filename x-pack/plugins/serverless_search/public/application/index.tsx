/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';

export async function renderApp(element: HTMLElement, core: CoreStart) {
  const { ElasticsearchOverview } = await import('./components/overview');
  ReactDOM.render(
    <KibanaThemeProvider theme$={core.theme.theme$}>
      <KibanaContextProvider services={core}>
        <I18nProvider>
          <ElasticsearchOverview />
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
}
